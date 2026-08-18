/******************************************************************************
 * app.js
 *
 * Main application controller.
 *
 * Responsibilities
 * ----------------
 * - Initialize the map
 * - Handle file selection
 * - Load GeoPackage
 * - Load photo folder
 * - Create markers
 * - Zoom to data
 * - Handle errors
 *
 ******************************************************************************/
 console.log("APP.JS LOADED");

import {
    createMap,
    zoomToPhotos
} from "./map.js";

import {
    loadGeoPackage
} from "./gpkg.js";

import {
    createMarkers,
    clearMarkers
} from "./markers.js";

import {
    choosePhotoDirectory,
    assignPhotoURLs
} from "./filesystem.js";


// -----------------------------------------------------------------------------
// Global State
// -----------------------------------------------------------------------------

const App = {

    map: null,

    photos: [],

    imageLookup: {},

    photoDirectoryLoaded: false,

    gpkgLoaded: false

};

window.App = App;
// -----------------------------------------------------------------------------
// DOM Elements
// -----------------------------------------------------------------------------

const gpkgInput = document.getElementById("gpkgFile");

const folderButton = document.getElementById("chooseFolder");

const status = document.getElementById("status");


// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

window.addEventListener("DOMContentLoaded", initialize);


/******************************************************************************
 * Initialize application
 ******************************************************************************/

async function initialize() {

    try {

        updateStatus("Initializing map...");

        App.map = createMap();

        bindEvents();

        updateStatus("Ready.");

    }

    catch (error) {

        console.error(error);

        updateStatus(error.message);

    }

}


/******************************************************************************
 * Bind UI events
 ******************************************************************************/

function bindEvents() {

    gpkgInput.addEventListener(
        "change",
        onGeoPackageSelected
    );

    folderButton.addEventListener(
        "click",
        onChooseFolder
    );

}


/******************************************************************************
 * User selects a GeoPackage
 ******************************************************************************/

async function onGeoPackageSelected(event) {

    const file = event.target.files[0];

    if (!file)
        return;

    try {

        updateStatus("Reading GeoPackage...");

        App.photos = await loadGeoPackage(file);

        App.gpkgLoaded = true;

        updateStatus(
            `${App.photos.length} photo locations loaded`
        );

        if (App.photoDirectoryLoaded) {

            assignPhotoURLs(
                App.photos,
                App.imageLookup
            );

            console.log(
                "Photos after URL assignment:",
                App.photos
            );

        }

        refreshMap();

    }

    catch (error) {

        console.error(error);

        updateStatus(error.message);

    }

}


/******************************************************************************
 * User chooses image folder
 ******************************************************************************/

 async function onChooseFolder() {

    try {

        updateStatus("Selecting image folder...");


        const lookup =
            await choosePhotoDirectory();


        App.imageLookup = lookup;


        App.photoDirectoryLoaded = true;


        updateStatus(
            `${Object.keys(App.imageLookup).length} images indexed`
        );


        if (App.gpkgLoaded) {


            assignPhotoURLs(
                App.photos,
                App.imageLookup
            );


            console.log(
                "Photos after folder assignment:",
                App.photos
            );


            refreshMap();


        }

    }

    catch (error) {

        console.error(error);

        updateStatus(error.message);

    }

}


/******************************************************************************
 * Refresh displayed markers
 ******************************************************************************/

function refreshMap() {

    console.log(
        "Refreshing map with:",
        App.photos
    );
    
    if (App.photos.length === 0)
        return;

    clearMarkers();

    createMarkers(

        App.map,

        App.photos

    );

    zoomToPhotos(

        App.map,

        App.photos

    );

}


/******************************************************************************
 * Update bottom status text
 ******************************************************************************/

function updateStatus(message) {

    console.log(message);

    if (status)

        status.textContent = message;

}
