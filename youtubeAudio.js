import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { spawn, spawnSync } from 'child_process';
import { Readable } from 'stream';
import { triggerNextSongInQueue } from './index.js'

let playBuffer = Buffer.alloc(1024 * 1024 * 50); //50MB +- 1Hora de video
let swapBuffer = Buffer.alloc(1024 * 1024 * 50); //50MB +- 1Hora de video
let playBufferLength = 0
let swapBufferLength = 0

let globalPlayer; // Variable para almacenar el reproductor de audio
let connection; // Variable para almacenar la conexión de voz
let ytProcess, ffmpegStream;

let swapLleno = false; 
let swapBufferEmpty = true;

let lastStateChange = 0;

let alreadyHandled = false;

const yt_dlp = "C:\\Git\\DiscordApp\\DJManwe\\lib\\yt-dlp.exe"

function getAudioPlayer() {
    if (!globalPlayer) {
        globalPlayer = createAudioPlayer();

        // Manejar errores
        globalPlayer.on('error', error => {
            console.error('Error en el AudioPlayer:', error);
        });
    }
    return globalPlayer;
}

export async function stopStreamYouTube() {
    const p = getAudioPlayer();
    if (p) {
        p.stop();
        console.log("Reproducción detenida");

        if (ytProcess) ytProcess.kill('SIGINT');
        if (ffmpegStream) ffmpegStream.destroy();

        if (connection) {
            connection.destroy(); // Disconnect from voice channel
            connection = null;
        }
    } else {
        console.log("No hay un reproductor activo");
    }
}

export function getPlaylistYoutube(youtubeUrl) {
    ytProcess = spawnSync(yt_dlp, [
        '--flat-playlist',
        '--print', '"%(url)s"',
        '--playlist-end', '500',
        youtubeUrl
    ]);

    // Verificar si hubo errores
    if (ytProcess.error) {
        console.error('Error ejecutando yt-dlp:', ytProcess.error.message);
        return null;
    }

    // Verificar si el proceso fue exitoso
    if (ytProcess.status !== 0) {
        console.error(`yt-dlp terminó con el código ${ytProcess.status}`);
        return null;
    }
    
    const playlistArray = ytProcess.stdout.toString().split('\n')
    const playlist = new Array(playlistArray.length - 1);
    for (let i = 0; i < playlistArray.length - 1; i++) {
        playlist[i] = playlistArray[i].slice(1, -1)
    }
    //console.log(playlist)
    return playlist
}

export function streamYouTubeSwap(channel, youtubeUrl, youtubeUrl2,replaceBuffers) {
    if (!channel) {
        console.error("Voice channel not found!");
        return;
    }
    if (youtubeUrl == undefined && youtubeUrl2 == undefined){
        console.error("No url provided")
    }
    // Ensure you're connected to the voice channel
    if (!connection || connection.joinConfig.channelId !== channel.id) {
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
    }

    if(replaceBuffers){
        console.log("Salto a una cancion no cargada")
        loadToPlayBuffer(youtubeUrl,()=> {playFromBuffer()});
        loadToSwapBuffer(youtubeUrl2)
    }
    else if(swapBufferEmpty){
        console.log("[ ][ ] o [x][ ]")
        //cargar en el playbuffer youtubeUrl //lanzar cancion
        loadToPlayBuffer(youtubeUrl,()=> {playFromBuffer()});

        if(youtubeUrl2 == undefined){
            swapBufferEmpty = true
        }else{
            //cargar en el swapbuffer youtubeUrl2
            loadToSwapBuffer(youtubeUrl2)
        }
    }
    else if(!swapBufferEmpty){
        console.log("[x][x]")

        //wait fill
        //console.log("Esperando swapbuffer...")
        waitForFullSwapBuffer()
        //console.log("Continuando")
        //swapbuffer to playbuffer
        let ref = playBuffer
        playBuffer = swapBuffer
        swapBuffer = ref
        //lanzar cancion
        //console.log("Launch")
        playFromBuffer()

        if(youtubeUrl2 == undefined){
            swapBufferEmpty = true
        }else{
            //cargar en el swapbuffer youtubeUrl2
            //console.log("Llenando swapbuffer")
            loadToSwapBuffer(youtubeUrl2)
        }
        
    }else{
        console.log("Buffers inconsistentes")
    }
}

function playFromBuffer(){
    const stream = Readable.from(playBuffer.subarray(0, playBufferLength))
    const resource = createAudioResource(stream, { inputType: 'arbitrary' });

    getAudioPlayer().play(resource);
    connection.subscribe(getAudioPlayer());

    getAudioPlayer().on('stateChange', (oldState, newState) => {
        if (newState.status === 'idle' && oldState.status !== 'idle' && !alreadyHandled) {
            console.log('El audio ha finalizado la reproducción.');
            alreadyHandled = true //bloquea bandera handle autoskip
            // Llama a la función para pasar a la siguiente canción
            triggerNextSongInQueue();
            setTimeout(() => {
                alreadyHandled = false;
            }, 1000); // Establecer un pequeño retraso antes de permitir un nuevo evento
        }
    });
    getAudioPlayer().on('error', (error) => {
        console.error('Error en la reproducción de audio:', error.message);
        // Detén la reproducción si ocurre un error
        stopStreamYouTube();
    });
}

export async function loadToSwapBuffer(youtubeUrl) {
    swapLleno = false
    ytProcess = spawn(yt_dlp, [
        '-f', 'bestaudio',      
        '--extract-audio',
        '--no-playlist',
        '--no-warnings',
        '--audio-quality', '128K',
        '-o', '-',
        youtubeUrl
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024 * 50  //50MB
    });

    swapBufferLength = 0
    swapBuffer.fill(0)
    ytProcess.stdout.on('data', (chunk) => {
        if(chunk.length + swapBufferLength > swapBuffer.length){
            console.log("Desbordamiento del swapBuffer")
            return
        }
        chunk.copy(swapBuffer, swapBufferLength)
        swapBufferLength += chunk.length
        //swapBuffer.push(chunk);  // Agregar el chunk al buffer
    });

    ytProcess.stdout.on('end', () => {
        swapLleno = true //pone la barrera a true y permite utilizar al hilo principal el swapbuffer
        console.log("Siguiente cancion cargada en el swapBuffer")
    });
    swapBufferEmpty = false
}

export function loadToPlayBuffer(youtubeUrl,callback) {
    ytProcess = spawn(yt_dlp, [
        '-f', 'bestaudio',      
        '--extract-audio',
        '--no-playlist',
        '--no-warnings',
        '--audio-quality', '128K',
        '-o', '-',
        youtubeUrl
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024 * 50  //50MB
    });

    playBufferLength = 0
    playBuffer.fill(0)
    ytProcess.stdout.on('data', (chunk) => {
        if(chunk.length + playBufferLength > playBuffer.length){
            console.log("Desbordamiento del playBuffer")
            return
        }
        chunk.copy(playBuffer, playBufferLength)
        playBufferLength += chunk.length

        //playBuffer.push(chunk);  // Agregar el chunk al buffer
    });

    ytProcess.stdout.on('end', () => {
        callback(youtubeUrl)
    });
    swapBufferEmpty = false
}

function waitForFullSwapBuffer() {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (swapLleno) {
                clearInterval(interval); // Detener el intervalo
                resolve(); // Resolver la promesa
            } else {
                //console.log('Esperando que la barrera se levante...');
            }
        }, 100); // Comprobar cada 100 ms
    });
}