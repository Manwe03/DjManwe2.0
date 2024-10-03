import dotenv from 'dotenv';
import path from 'path';
dotenv.config()

import { Client, GatewayIntentBits, InteractionType } from 'discord.js';
//import { playAudioInVoiceChannel, stopAudioInVoiceChannel } from './audio.js'
import { streamYouTubeSwap, stopStreamYouTube, getPlaylistYoutube } from './youtubeAudio.js'
import { getFilesInDirectory } from './fileSongs.js'
//import { generateDependencyReport, createAudioPlayer, AudioPlayerStatus } from '@discordjs/voice';

const songsFile = path.join('C:', 'Users', 'manub', 'Music', 'local')

let audioPlaying = false
let playlist = []
let playlistIndex = 0
let tempChanel;

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
});

client.login(process.env.DISCORD_TOKEN);

// Evento para detectar cuando el bot está listo y conectado
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message)=>{

})

// Manejar las interacciones (slash commands)
client.on('interactionCreate', async interaction => {
    if (interaction.type === InteractionType.ApplicationCommand) {
        if (interaction.commandName === 'stop') {
            handleDjStopInteractions(interaction)
        }
        else if (interaction.commandName === 'skip') {
            handleDjSkipInteractions(interaction)
        }
        else if (interaction.commandName === 'play') {
            handleDjPlayInteractions(interaction,false)
        }else if (interaction.commandName === 'shuffle') {
            playlistIndex = 0
            shufflePlaylist()
            let localUrl = playNextSongInQueue(tempChanel,0)
            await interaction.reply("["+(playlistIndex+1)+"/"+playlist.length+"] Shuffle: " + localUrl);
        }
    }
});
async function handleDjStopInteractions(interaction){
    playlist = []
    playlistIndex = 0
    audioPlaying = false
    stopStreamYouTube()
    await interaction.reply("Playlist vaciada");
}
async function handleDjSkipInteractions(interaction){
    if(tempChanel != interaction.member.voice.channel){
        await interaction.reply("Diferente canal");
        return
    } 

    let n = 0
    let string_n = interaction.options.getString('n');
    //console.log("string: "+string_n)
    if(string_n == undefined){ n = 1 }
    else{
        n = Number(string_n)
        if(isNaN(n)) n = 1
    }

    //console.log(n)
    let succes = playNextSongInQueue(tempChanel,n)
    if(succes == 'empty'){
        await interaction.reply("Playlist vacia");
    }
    else if(succes == 'range'){
        await interaction.reply("Skip fuera de playlist");
    }else{
        await interaction.reply("["+(playlistIndex+1)+"/"+playlist.length+"] Skip: " + succes);
    }
}
async function handleDjPlayInteractions(interaction,shuffle){
    tempChanel = interaction.member.voice.channel;
    let url = interaction.options.getString('url');
    if(isPlaylist(url) || isMix(url)){
        //Nueva playlist (reemplazar)
        await interaction.deferReply({ ephemeral: false });
        const timeout = setTimeout(() => {
            interaction.followUp("Cargando...");
        }, 3000);
        playlist = getPlaylistYoutube(url)
        
        playlistIndex = 0
        //console.log(playlist)
        let localUrl = playNextSongInQueue(tempChanel,0)
        clearTimeout(timeout);
        await interaction.editReply("["+(playlistIndex+1)+"/"+playlist.length+"] Cargada nueva playlist: " + localUrl);
    }else{
        if(!isValidYouTubeUrl(url)){
            await interaction.reply("No es una url");
            return
        }
        playlist.push(url)
        if(audioPlaying){
            await interaction.reply("["+(playlistIndex+1)+"/"+playlist.length+"] Añadido a la playlist: "+url);
        }else{
            //Nueva playlist con una cancion
            playlistIndex = 0
            playNextSongInQueue(tempChanel,0)
            await interaction.reply("["+(playlistIndex+1)+"/"+playlist.length+"] Añadido a la playlist: "+url);
        }
    }  
}

function isPlaylist(url){
    const index = url.indexOf("index=");
    if (index === -1) return false
    return true
}
function isMix(url){
    const list = url.indexOf("list=");
    if (list === -1) return false
    return true
}

function getSongSuggestions(focusedOption) {
    //const availableSongs = ['hombro', 'moroco', 'retumbar','pegasus']; // Puedes reemplazar esto con tu propia lógica
    const availableSongs = getFilesInDirectory(songsFile)
    const filteredSongs = availableSongs.filter(song => song.toLowerCase().includes(focusedOption.toLowerCase()));
    //console.log(filteredSongs)
    return filteredSongs.slice(0,10)
}

export function triggerNextSongInQueue(){
    playNextSongInQueue(tempChanel,1)
}

function playNextSongInQueue(channel,count){
    //console.log(playlist)
    let newIndex = playlistIndex + count
    if(newIndex < 0 || newIndex >= playlist.length) return 'range' //fuera de rango
 
    playlistIndex = newIndex
    const songurl = playlist[playlistIndex]
    const songurl2 = playlist[playlistIndex+1]

    //console.log("Tamaño: "+playlist.length+" Mandando a youtubeAudio..")
    console.log("Indice: "+playlistIndex+" "+songurl)
    console.log("Indice: "+(playlistIndex+1)+" "+songurl2)
    
    if(songurl == undefined) return 'empty'   //playlist vacia

    streamYouTubeSwap(channel,songurl,songurl2,count != 1)

    audioPlaying = true;
    return songurl
}

function shufflePlaylist() {
    for (let i = playlist.length - 1; i > 0; i--) {
        // Seleccionamos un índice aleatorio entre 0 y i
        const j = Math.floor(Math.random() * (i + 1));
        // Intercambiamos los elementos array[i] y array[j]
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
}

function isValidYouTubeUrl(url) {
    return url.indexOf('youtube.com/watch?v=') !== -1 || url.indexOf('youtu.be/') !== -1;
}