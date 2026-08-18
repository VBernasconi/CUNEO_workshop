/******************************************************************************
 * similarity.js
 *
 * Calculates similarity between photos.
 *
 * Features:
 *   - GPS distance
 *   - Timestamp proximity
 *   - AI metadata text similarity
 *   - Color similarity placeholder
 *
 ******************************************************************************/


/******************************************************************************
 * Rank all photos
 *
 * Returns:
 *
 * [
 *   {
 *      photo: photoObject,
 *      score: 0.87
 *   }
 * ]
 *
 ******************************************************************************/

export function rankPhotos(
    photos,
    weights = {}
) {


    const result = [];


    for (
        const photo of photos
    ) {


        let score = 0;



        const geo =
            geoScore(
                photo,
                photos
            );


        const time =
            timeScore(
                photo,
                photos
            );


        const semantic =
            semanticScore(
                photo,
                photos
            );


        const color =
            colorScore(
                photo
            );



        score +=
            geo *
            (weights.geo ?? 0);



        score +=
            time *
            (weights.time ?? 0);



        score +=
            semantic *
            (weights.semantic ?? 0);



        score +=
            color *
            (weights.color ?? 0);



        result.push({

            photo,

            score

        });


    }



    return result.sort(

        (a,b)=>
            b.score-a.score

    );

}




/******************************************************************************
 * Geographic similarity
 *
 * Close together = similar
 *
 ******************************************************************************/

function geoScore(
    photo,
    photos
) {


    if(
        !photo.latitude ||
        !photo.longitude
    )
        return 0;



    let best = 0;



    for(
        const other of photos
    ){


        if(other===photo)
            continue;



        const distance =
            haversine(
                photo.latitude,
                photo.longitude,
                other.latitude,
                other.longitude
            );



        const score =
            Math.max(
                0,
                1 -
                distance / 50000
            );



        if(score > best)
            best = score;

    }


    return best;

}





/******************************************************************************
 * Time similarity
 *
 * Same day/hour = high score
 *
 ******************************************************************************/

function timeScore(
    photo,
    photos
){

    if(!photo.timestamp)
        return 0;



    let best=0;


    const date =
        parseDate(
            photo.timestamp
        );



    for(
        const other of photos
    ){

        if(
            other===photo ||
            !other.timestamp
        )
            continue;



        const diff =
            Math.abs(
                date -
                parseDate(other.timestamp)
            );



        const hours =
            diff /
            (1000*60*60);



        const score =
            Math.max(
                0,
                1 -
                hours/72
            );



        if(score>best)
            best=score;

    }



    return best;

}





/******************************************************************************
 * AI semantic similarity
 *
 * Uses:
 *
 * caption
 * scene
 * keywords
 * objects
 *
 ******************************************************************************/

function semanticScore(
    photo,
    photos
){


    const text =
        photoText(
            photo
        );



    if(!text)
        return 0;



    let best=0;



    for(
        const other of photos
    ){

        if(other===photo)
            continue;


        const otherText =
            photoText(
                other
            );



        const score =
            textSimilarity(
                text,
                otherText
            );



        if(score>best)
            best=score;

    }


    return best;

}





function photoText(photo){


    let parts=[];



    if(photo.caption)
        parts.push(
            photo.caption
        );


    if(photo.scene)
        parts.push(
            photo.scene
        );


    if(
        Array.isArray(photo.keywords)
    )
        parts.push(
            photo.keywords.join(" ")
        );


    if(
        Array.isArray(photo.objects)
    )
        parts.push(
            JSON.stringify(
                photo.objects
            )
        );



    return parts
        .join(" ")
        .toLowerCase();

}





/******************************************************************************
 * Very simple text similarity
 *
 * Counts shared words
 *
 ******************************************************************************/

function textSimilarity(
    a,
    b
){

    if(!a || !b)
        return 0;



    const wordsA =
        new Set(
            a.split(/\W+/)
        );


    const wordsB =
        new Set(
            b.split(/\W+/)
        );



    let common=0;



    for(
        const word of wordsA
    ){

        if(
            wordsB.has(word) &&
            word.length>3
        )
            common++;

    }



    return Math.min(
        1,
        common /
        Math.max(
            wordsA.size,
            wordsB.size
        )
    );

}





/******************************************************************************
 * Color similarity
 *
 * Placeholder.
 *
 * Later this can use image embeddings
 * or RGB histograms.
 *
 ******************************************************************************/

function colorScore(photo){

    return 0;

}





/******************************************************************************
 * Haversine distance
 ******************************************************************************/

function haversine(
    lat1,
    lon1,
    lat2,
    lon2
){

    const R =
        6371000;


    const p1 =
        lat1*Math.PI/180;


    const p2 =
        lat2*Math.PI/180;


    const dp =
        (lat2-lat1)*
        Math.PI/180;


    const dl =
        (lon2-lon1)*
        Math.PI/180;



    const a =
        Math.sin(dp/2)**2 +
        Math.cos(p1)*
        Math.cos(p2)*
        Math.sin(dl/2)**2;



    return (
        2 *
        R *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1-a)
        )
    );

}





/******************************************************************************
 * Parse timestamp
 ******************************************************************************/

function parseDate(value){

    if(!value)
        return new Date(0);


    // Your EXIF format:
    // 2026:07:24 18:41:50

    return new Date(
        value.replace(
            /:/g,
            "-"
        )
    );

}
