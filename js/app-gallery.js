 /******************************************************************************
  * app-gallery.js
  *
  * Photo similarity gallery controller
  *
  * - Loads GeoPackage
  * - Loads local image folder
  * - Assigns image URLs
  * - Calculates similarity ranking
  * - Displays grid
  *
  ******************************************************************************/

import {
    loadGeoPackage
} from "./gpkg.js";


import {
    choosePhotoDirectory,
    assignPhotoURLs
} from "./filesystem.js";


import {
    rankPhotos
} from "./similarity.js";



// -----------------------------------------------------------------------------
// Global state
// -----------------------------------------------------------------------------

const App = {

    photos: [],

    imageLookup: {},

    gpkgLoaded:false,

    folderLoaded:false

};


window.App = App;



// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------

const gallery =
    document.getElementById(
        "gallery"
    );


const status =
    document.getElementById(
        "status"
    );


const loadButton =
    document.getElementById(
        "loadGallery"
    );



const weights = {

    geo:
        document.getElementById(
            "geoWeight"
        ),

    time:
        document.getElementById(
            "timeWeight"
        ),

    semantic:
        document.getElementById(
            "semanticWeight"
        ),

    color:
        document.getElementById(
            "colorWeight"
        )

};



// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------

loadButton.addEventListener(
    "click",
    loadGallery
);



async function loadGallery(){


    try {


        updateStatus(
            "Select GeoPackage..."
        );


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "file";


        input.accept =
            ".gpkg";


        input.onchange =
            async ()=>{


                const file =
                    input.files[0];


                App.photos =
                    await loadGeoPackage(
                        file
                    );


                App.gpkgLoaded =
                    true;



                updateStatus(
                    `${App.photos.length} photos loaded`
                );



                await loadFolder();


            };


        input.click();


    }


    catch(error){

        console.error(error);

        updateStatus(
            error.message
        );

    }


}




// -----------------------------------------------------------------------------
// Load image folder
// -----------------------------------------------------------------------------

async function loadFolder(){


    updateStatus(
        "Choose image folder..."
    );


    App.imageLookup =
        await choosePhotoDirectory();



    App.folderLoaded =
        true;



    assignPhotoURLs(
        App.photos,
        App.imageLookup
    );


    renderGallery();


}



// -----------------------------------------------------------------------------
// Render gallery
// -----------------------------------------------------------------------------

function renderGallery(){


    gallery.innerHTML =
        "";



    const ranked =
        rankPhotos(

            App.photos,

            {

                geo:
                    Number(
                        weights.geo.value
                    ) / 100,


                time:
                    Number(
                        weights.time.value
                    ) / 100,


                semantic:
                    Number(
                        weights.semantic.value
                    ) / 100,


                color:
                    Number(
                        weights.color.value
                    ) / 100

            }

        );



    for(
        const item of ranked
    ){


        const photo =
            item.photo;



        const card =
            document.createElement(
                "div"
            );


        card.className =
            "photo-card";



        card.innerHTML = `

            <img 
                src="${photo.imageURL}"
                loading="lazy"
            >


            <div class="photo-info">

                <strong>
                    ${photo.filename}
                </strong>


                <span class="similarity-score">

                    Similarity:
                    ${(item.score*100).toFixed(1)}%

                </span>


                <br>

                ${photo.caption || ""}

            </div>

        `;



        gallery.appendChild(
            card
        );


    }


    updateStatus(
        `${ranked.length} images displayed`
    );


}



// -----------------------------------------------------------------------------
// Update when sliders move
// -----------------------------------------------------------------------------

for(
    const slider of Object.values(weights)
){

    slider.addEventListener(
        "input",
        ()=>{

            if(App.photos.length)
                renderGallery();

        }
    );

}



// -----------------------------------------------------------------------------
// Status
// -----------------------------------------------------------------------------

function updateStatus(message){

    console.log(message);

    if(status)
        status.textContent =
            message;

}
