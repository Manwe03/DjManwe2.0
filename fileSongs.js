import fs from 'fs';
import path from 'path';

export function getFilesInDirectory(startDir) {
    let filesList = [];
    let stack = [startDir];  // Usamos una pila para almacenar los directorios a explorar

    while (stack.length > 0) {
        const currentDir = stack.pop();  // Sacamos el último directorio de la pila
        const files = fs.readdirSync(currentDir);  // Leemos el contenido del directorio

        files.forEach(file => {
            const filePath = path.join(currentDir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Si es un directorio, lo añadimos a la pila para explorar más tarde
                stack.push(filePath);
            } else {
                // Si es un archivo, lo añadimos a la lista, recortando el path
                const relativePath = path.relative(startDir, filePath);
                filesList.push(relativePath);
            }
        });
    }
    return filesList;
}
