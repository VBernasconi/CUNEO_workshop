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

    await scanDirectory(
        directoryHandle,
        lookup
    );


    // Store globally for later access
    App.imageLookup = lookup;


    console.log(
        "Image lookup created:",
        App.imageLookup
    );


    return lookup;

}


/******************************************************************************
 * Recursively scan a directory
 ******************************************************************************/

async function scanDirectory(handle, lookup) {

    for await (const entry of handle.values()) {
        if (entry.kind === "directory") {

            await scanDirectory(
                entry,
                lookup
            );

        }


        else if (entry.kind === "file") {


            const extension =
                getExtension(entry.name);


            if (!isImage(extension))
                continue;


            /*const file =
                await entry.getFile();


            const key =
                entry.name.toLowerCase();


            lookup[key] = {

                file,

                handle: entry,

                url:
                    URL.createObjectURL(file)

            };*/

            const originalFile = await entry.getFile();
            let displayFile = originalFile;

            if (
                originalFile.type === "image/heic" ||
                entry.name.toLowerCase().endsWith(".heic")
            ) {

                console.log(
                    "Converting HEIC:",
                    entry.name
                );

                const convertedBlob = await heic2any({
                    blob: originalFile,
                    toType: "image/jpeg"
                });


                displayFile = new File(
                    [convertedBlob],
                    entry.name.replace(
                        /\.heic$/i,
                        ".jpg"
                    ),
                    {
                        type: "image/jpeg"
                    }
                );
            }

            lookup[entry.name.toLowerCase()] = {
                file: displayFile,
                handle: entry,
                url: URL.createObjectURL(displayFile)
            };
        }
    }
}


/******************************************************************************
 * Attach image URLs to GeoPackage photos
 ******************************************************************************/

export function assignPhotoURLs(
    photos,
    lookup
) {


    for (const photo of photos) {


        const key =
            photo.filename.toLowerCase();


        const image =
            lookup[key];


        console.log(
            photo.filename,
            image
        );


        if (!image) {

            console.warn(
                "Image not found:",
                photo.filename
            );

            photo.imageURL = null;

            continue;

        }


        photo.imageURL =
            image.url;


        photo.file =
            image.file;


    }

}


/******************************************************************************
 * Get image URL from filename
 ******************************************************************************/

export function getImageURL(
    filename,
    lookup
) {

    if (!filename)
        return null;


    const key =
        filename.toLowerCase();


    return lookup[key]
        ? lookup[key].url
        : null;

}


/******************************************************************************
 * Get File object
 ******************************************************************************/

export function getFile(
    filename,
    lookup
) {

    if (!filename)
        return null;


    const key =
        filename.toLowerCase();


    return lookup[key]
        ? lookup[key].file
        : null;

}


/******************************************************************************
 * Release blob URLs
 ******************************************************************************/

export function releaseLookup(
    lookup
) {

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