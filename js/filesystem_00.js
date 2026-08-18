/******************************************************************************
 * filesystem.js
 *
 * Handles local photo directory selection.
 *
 * Browser support:
 *   Chrome
 *   Edge
 *   Opera
 *
 ******************************************************************************/

/******************************************************************************
 * Ask user to choose a directory
 ******************************************************************************/

export async function choosePhotoDirectory() {

    if (!window.showDirectoryPicker) {

        throw new Error(
            "Your browser does not support the File System Access API."
        );

    }

    const directoryHandle =
        await window.showDirectoryPicker();

    const lookup = {};

    await scanDirectory(directoryHandle, lookup);

    return lookup;

}


/******************************************************************************
 * Recursively scan a directory
 ******************************************************************************/

async function scanDirectory(handle, lookup) {

    for await (const entry of handle.values()) {

        if (entry.kind === "directory") {

            await scanDirectory(entry, lookup);

        }

        else if (entry.kind === "file") {

            const extension =
                getExtension(entry.name);

            if (!isImage(extension))
                continue;

            const file = await entry.getFile();

            lookup[entry.name.toLowerCase()] = {

                file,

                handle: entry,

                url: URL.createObjectURL(file)

            };

        }

    }

}


/******************************************************************************
 * Attach image URLs to every photo
 ******************************************************************************/

export function assignPhotoURLs(photos, lookup) {

    for (const photo of photos) {
        console.log(
            photo.filename,
            App.imageLookup[photo.filename]
        );

        const key = photo.filename.toLowerCase();

        const file = App.imageLookup[photo.filename];

        if (!file)
            continue;

        photo.imageURL = URL.createObjectURL(file);
        
        /*if (lookup[key]) {

            photo.imageURL =
                lookup[key].url;

            photo.file =
                lookup[key].file;

        }

        else {

            photo.imageURL = null;

        }*/

    }

}


/******************************************************************************
 * Get image URL from filename
 ******************************************************************************/

export function getImageURL(filename, lookup) {

    if (!filename)
        return null;

    const key =
        filename.toLowerCase();

    if (!lookup[key])
        return null;

    return lookup[key].url;

}


/******************************************************************************
 * Get File object
 ******************************************************************************/

export function getFile(filename, lookup) {

    if (!filename)
        return null;

    const key =
        filename.toLowerCase();

    if (!lookup[key])
        return null;

    return lookup[key].file;

}


/******************************************************************************
 * Release blob URLs
 ******************************************************************************/

export function releaseLookup(lookup) {

    for (const key in lookup) {

        URL.revokeObjectURL(
            lookup[key].url
        );

    }

}


/******************************************************************************
 * Check extension
 ******************************************************************************/

function isImage(extension) {

    return [

        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "tif",
        "tiff",
        "heic",
        "heif",
        "avif"

    ].includes(extension);

}


/******************************************************************************
 * Extract extension
 ******************************************************************************/

function getExtension(filename) {

    const index =
        filename.lastIndexOf(".");

    if (index === -1)
        return "";

    return filename
        .substring(index + 1)
        .toLowerCase();

}
