/******************************************************************************
 * popup.js
 *
 * Creates MapTiler popup content for photos.
 *
 * Responsibilities:
 * -----------------
 * - Generate popup HTML
 * - Display thumbnail/image
 * - Display AI metadata
 * - Open gallery viewer
 *
 ******************************************************************************/

import {
    openGallery
} from "./gallery.js";


// -----------------------------------------------------------------------------
// Create popup
// -----------------------------------------------------------------------------

export function createPopup(photo) {


    const container =
        document.createElement("div");


    container.className =
        "photo-popup";


    container.innerHTML =
        buildPopupHTML(photo);



    attachEvents(
        container,
        photo
    );



    return new maptilersdk.Popup({

        maxWidth: "350px"

    })
    .setDOMContent(
        container
    );

}



// -----------------------------------------------------------------------------
// Generate HTML
// -----------------------------------------------------------------------------

function buildPopupHTML(photo) {


    const image =
        photo.imageURL

        ?

        `

        <img

            class="popup-image"

            src="${photo.imageURL}"

            alt="${escapeHTML(photo.filename)}"

        >

        `

        :

        `

        <div class="no-image">

            No image available

        </div>

        `;



    return `


        <div class="popup-content">


            ${image}


            <div class="popup-info">


                <h3>

                    ${escapeHTML(
                        photo.filename || "Unknown"
                    )}

                </h3>



                ${createLine(

                    "Date",

                    photo.properties?.date

                )}



                ${createLine(

                    "Camera",

                    photo.properties?.camera

                )}



                ${createLine(

                    "People",

                    photo.people

                )}



                ${createLine(

                    "Scene",

                    photo.scene

                )}



                ${createKeywords(

                    photo.keywords

                )}



                


            </div>


        </div>


    `;

}



// -----------------------------------------------------------------------------
// Attach popup events
// -----------------------------------------------------------------------------

function attachEvents(container, photo) {


    const button =
        container.querySelector(
            "[data-action='open-gallery']"
        );


    if (button) {


        button.addEventListener(

            "click",

            () => {

                openGallery(photo);

            }

        );


    }


    const image =
        container.querySelector(
            ".popup-image"
        );


    if (image) {


        image.addEventListener(

            "click",

            () => {

                openGallery(photo);

            }

        );


        image.style.cursor =
            "pointer";

    }


}



// -----------------------------------------------------------------------------
// Create information row
// -----------------------------------------------------------------------------

function createLine(label, value) {


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return "";

    }



    return `

        <div class="popup-row">

            <strong>
                ${label}
            </strong>

            <span>
                ${escapeHTML(
                    String(value)
                )}
            </span>

        </div>

    `;

}



// -----------------------------------------------------------------------------
// Create keyword list
// -----------------------------------------------------------------------------

function createKeywords(keywords) {


    if (
        !keywords ||
        keywords.length === 0
    ) {

        return "";

    }



    return `


        <div class="keywords">


            ${keywords.map(k =>

                `

                <span class="keyword">

                    ${escapeHTML(k)}

                </span>

                `

            ).join("")}


        </div>


    `;

}



// -----------------------------------------------------------------------------
// Prevent HTML injection
// -----------------------------------------------------------------------------

function escapeHTML(value) {


    return value

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
