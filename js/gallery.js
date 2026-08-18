/******************************************************************************
 * gallery.js
 *
 * Fullscreen photo viewer.
 *
 * Responsibilities:
 * -----------------
 * - Open selected photo fullscreen
 * - Navigate between photos
 * - Keyboard controls
 * - Close viewer
 *
 ******************************************************************************/


// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------

let currentPhotos = [];

let currentIndex = -1;

let overlay = null;


// -----------------------------------------------------------------------------
// Open gallery
// -----------------------------------------------------------------------------

export function openGallery(photo) {


    if (!photo)
        return;


    /*
       The gallery needs the complete photo list.
       If not already initialized, create a single-photo gallery.
    */

    if (
        currentPhotos.length === 0 ||
        !currentPhotos.includes(photo)
    ) {

        currentPhotos = [photo];

        currentIndex = 0;

    }

    else {

        currentIndex =
            currentPhotos.indexOf(photo);

    }



    createViewer();

    showCurrentPhoto();

}



// -----------------------------------------------------------------------------
// Initialize gallery with all photos
// -----------------------------------------------------------------------------

export function initializeGallery(photos) {

    currentPhotos =
        photos || [];

}



// -----------------------------------------------------------------------------
// Create viewer DOM
// -----------------------------------------------------------------------------

function createViewer() {


    if (overlay)
        return;



    overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "gallery-overlay";



    overlay.innerHTML = `


        <button class="gallery-close">

            ✕

        </button>



        <button class="gallery-prev">

            ‹

        </button>



        <div class="gallery-container">


            <img class="gallery-image">


            <div class="gallery-info">

            </div>


        </div>



        <button class="gallery-next">

            ›

        </button>


    `;



    document.body.appendChild(
        overlay
    );



    // Buttons

    overlay
        .querySelector(
            ".gallery-close"
        )
        .onclick =
        closeGallery;



    overlay
        .querySelector(
            ".gallery-prev"
        )
        .onclick =
        previousPhoto;



    overlay
        .querySelector(
            ".gallery-next"
        )
        .onclick =
        nextPhoto;



    // Background click

    overlay.addEventListener(

        "click",

        event => {

            if (
                event.target === overlay
            ) {

                closeGallery();

            }

        }

    );



    // Keyboard

    document.addEventListener(

        "keydown",

        keyboardHandler

    );


}



// -----------------------------------------------------------------------------
// Display current photo
// -----------------------------------------------------------------------------

function showCurrentPhoto() {


    if (
        currentIndex < 0 ||
        currentIndex >= currentPhotos.length
    ) {

        return;

    }



    const photo =
        currentPhotos[currentIndex];



    const image =
        overlay.querySelector(
            ".gallery-image"
        );



    image.src =
        photo.imageURL || "";



    image.alt =
        photo.filename || "";



    const info =
        overlay.querySelector(
            ".gallery-info"
        );



    info.innerHTML = `


        <h3>

            ${escapeHTML(
                photo.filename || ""
            )}

        </h3>



        ${
            photo.caption

            ?

            `<p>
                ${escapeHTML(photo.caption)}
             </p>`

            :

            ""

        }



        ${
            photo.scene

            ?

            `<p>
                Scene:
                ${escapeHTML(photo.scene)}
             </p>`

            :

            ""

        }



        <p>

            ${
                currentIndex + 1
            }

            /

            ${
                currentPhotos.length
            }

        </p>


    `;


}



// -----------------------------------------------------------------------------
// Next photo
// -----------------------------------------------------------------------------

export function nextPhoto() {


    if (
        currentPhotos.length === 0
    )
        return;



    currentIndex++;



    if (
        currentIndex >= currentPhotos.length
    ) {

        currentIndex = 0;

    }



    showCurrentPhoto();

}



// -----------------------------------------------------------------------------
// Previous photo
// -----------------------------------------------------------------------------

export function previousPhoto() {


    if (
        currentPhotos.length === 0
    )
        return;



    currentIndex--;



    if (
        currentIndex < 0
    ) {

        currentIndex =
            currentPhotos.length - 1;

    }



    showCurrentPhoto();

}



// -----------------------------------------------------------------------------
// Close gallery
// -----------------------------------------------------------------------------

export function closeGallery() {


    if (!overlay)
        return;



    overlay.remove();


    overlay = null;


    document.removeEventListener(

        "keydown",

        keyboardHandler

    );


}



// -----------------------------------------------------------------------------
// Keyboard controls
// -----------------------------------------------------------------------------

function keyboardHandler(event) {


    switch(event.key) {


        case "Escape":

            closeGallery();

            break;



        case "ArrowRight":

            nextPhoto();

            break;



        case "ArrowLeft":

            previousPhoto();

            break;


    }

}



// -----------------------------------------------------------------------------
// HTML escaping
// -----------------------------------------------------------------------------

function escapeHTML(value) {


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}
