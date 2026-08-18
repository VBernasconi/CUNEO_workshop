/******************************************************************************
 * markers.js
 *
 * Creates and manages photo markers on the MapTiler map.
 *
 ******************************************************************************/

import {
    createPopup
} from "./popup.js";


// Store created markers

let markers = [];



/******************************************************************************
 * Create markers from photos
 ******************************************************************************/

export function createMarkers(
    map,
    photos
) {


    clearMarkers();



    for (
        const photo of photos
    ) {

        console.log(
            "Marker photo:",
            photo.filename,
            photo.imageURL
        );

        if (
            typeof photo.longitude !== "number" ||
            typeof photo.latitude !== "number"
        ) {

            continue;

        }



        const element =
            createMarkerElement(photo);



        const marker =
            new maptilersdk.Marker({
                element
            })
            .setLngLat([
                photo.longitude,
                photo.latitude
            ])

            .setPopup(
                createPopup(photo)
            )
            .addTo(map);



        markers.push({

            marker,

            photo

        });


    }


    return markers;

}



/******************************************************************************
 * Remove all markers
 ******************************************************************************/

export function clearMarkers() {

    for (
        const item of markers
    ) {
        item.marker.remove();
    }

    markers = [];

}



/******************************************************************************
 * Create marker HTML element
 ******************************************************************************/

 function createMarkerElement(photo) {

    console.log(
        "Creating marker element:",
        photo.filename,
        photo.imageURL
    );


    const element =
        document.createElement("div");

    element.style.width = "80px";
    element.style.height = "80px";


    element.className =
        "photo-marker";


    if (photo.imageURL) {

        element.innerHTML = `

            <img
                src="${photo.imageURL}"
                class="photo-thumbnail"
                style="width:200px"
            >

        `;

    }
    else {

        element.innerHTML = `

            <div class="marker-pin"></div>

        `;

    }


    return element;

}



/******************************************************************************
 * Find marker by photo
 ******************************************************************************/

export function findMarker(
    photo
) {


    return markers.find(

        item =>
            item.photo === photo

    );

}



/******************************************************************************
 * Get all markers
 ******************************************************************************/

export function getMarkers() {

    return markers;

}
