/******************************************************************************
 * map.js
 *
 * MapTiler map initialization and map utilities.
 *
 * Responsibilities:
 * -----------------
 * - Initialize MapTiler map
 * - Configure map style
 * - Zoom to photo locations
 *
 ******************************************************************************/


let mapInstance = null;



/******************************************************************************
 * Create MapTiler map
 ******************************************************************************/

export function createMap() {


    // Replace with your MapTiler API key

    maptilersdk.config.apiKey =
        "72lyzb1dsH5d7vS7hW5x";



    mapInstance =
        new maptilersdk.Map({

            container: "map",


            // Available styles:
            // STREET
            // SATELLITE
            // OUTDOOR

            style:
                maptilersdk.MapStyle.SATELLITE,


            center: [

                0,

                0

            ],


            zoom: 2,


            attributionControl: true


        });



    mapInstance.on(
        "load",
        () => {

            console.log(
                "Map loaded"
            );

        }
    );



    return mapInstance;

}



/******************************************************************************
 * Get current map instance
 ******************************************************************************/

export function getMap() {

    return mapInstance;

}



/******************************************************************************
 * Zoom map to all photos
 ******************************************************************************/

export function zoomToPhotos(
    map,
    photos
) {


    if (
        !photos ||
        photos.length === 0
    ) {

        return;

    }



    const bounds =
        new maptilersdk.LngLatBounds();



    let validPoints = 0;



    for (
        const photo of photos
    ) {


        if (
            typeof photo.longitude !== "number" ||
            typeof photo.latitude !== "number"
        ) {

            continue;

        }



        bounds.extend([

            photo.longitude,

            photo.latitude

        ]);



        validPoints++;

    }



    if (
        validPoints === 0
    ) {

        console.warn(
            "No valid coordinates found"
        );

        return;

    }



    if (
        validPoints === 1
    ) {


        const point =
            photos.find(
                p =>
                    typeof p.longitude === "number" &&
                    typeof p.latitude === "number"
            );



        map.flyTo({

            center: [

                point.longitude,

                point.latitude

            ],

            zoom: 16

        });


    }

    else {


        map.fitBounds(

            bounds,

            {

                padding: 80,

                maxZoom: 16,

                duration: 1000

            }

        );

    }

}



/******************************************************************************
 * Change map style dynamically
 ******************************************************************************/

export function setMapStyle(styleName) {


    if (!mapInstance)
        return;



    const styles = {


        street:
            maptilersdk.MapStyle.STREETS,


        satellite:
            maptilersdk.MapStyle.SATELLITE,


        outdoor:
            maptilersdk.MapStyle.OUTDOOR


    };



    if (
        styles[styleName]
    ) {


        mapInstance.setStyle(

            styles[styleName]

        );

    }

}
