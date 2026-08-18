const canvas =
    document.getElementById("canvas");

const embeddingButton =
    document.getElementById("embeddingButton");

const geoButton =
    document.getElementById("geoButton");

const imageCount =
    document.getElementById("imageCount");

const info =
    document.getElementById("info");


const IMAGE_SIZE = 70;

const PADDING = 30;


/*
 * Current visualization.
 *
 * "embedding"
 * or
 * "geo"
 */

let currentMode = "embedding";


let images = [];


/* --------------------------------------------------
   Load data
-------------------------------------------------- */

async function loadData() {

    const response =
        await fetch("MediaInventory.json");

    if (!response.ok) {

        throw new Error(
            `Could not load image data: ${response.status}`
        );
    }

    images =
        await response.json();

    console.log(
        "Loaded images:",
        images.length
    );

    imageCount.textContent =
        `${images.length} images`;

    createImageElements();

    positionImages();
}


/* --------------------------------------------------
   Create thumbnails
-------------------------------------------------- */

function createImageElements() {

    canvas.innerHTML = "";

    for (const image of images) {

        const element =
            document.createElement("img");

        element.className =
            "image-tile";

        element.src =
            image.filepath;

        element.alt =
            image.filename;

        element.dataset.filename =
            image.filename;

        element.addEventListener(
            "click",
            () => showInfo(image)
        );

        canvas.appendChild(element);

        image.element = element;
    }
}


/* --------------------------------------------------
   Calculate coordinate ranges
-------------------------------------------------- */

function getRange(values) {

    const valid =
        values.filter(
            value =>
                Number.isFinite(value)
        );

    return {

        min: Math.min(...valid),

        max: Math.max(...valid)

    };
}


/* --------------------------------------------------
   Normalize value to 0..1
-------------------------------------------------- */

function normalize(
    value,
    min,
    max
) {

    if (max === min)
        return 0.5;

    return (
        (value - min) /
        (max - min)
    );
}


/* --------------------------------------------------
   Position all images
-------------------------------------------------- */

function positionImages() {

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;


    if (!width || !height)
        return;


    /*
     * ----------------------------------------------
     * Choose coordinates
     * ----------------------------------------------
     */

    let xValues;
    let yValues;


    if (currentMode === "embedding") {

        xValues =
            images.map(
                image =>
                    Number(image.embedding_x)
            );

        yValues =
            images.map(
                image =>
                    Number(image.embedding_y)
            );

    }
    else {

        xValues =
            images.map(
                image =>
                    Number(image.longitude)
            );

        yValues =
            images.map(
                image =>
                    Number(image.latitude)
            );
    }


    const xRange =
        getRange(xValues);

    const yRange =
        getRange(yValues);


    /*
     * ----------------------------------------------
     * Position each image
     * ----------------------------------------------
     */

    for (const image of images) {

        let x;
        let y;


        if (currentMode === "embedding") {

            x =
                Number(image.embedding_x);

            y =
                Number(image.embedding_y);

        }
        else {

            x =
                Number(image.longitude);

            y =
                Number(image.latitude);
        }


        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {

            image.element.style.display =
                "none";

            continue;
        }


        image.element.style.display =
            "block";


        /*
         * Normalize.
         */

        const nx =
            normalize(
                x,
                xRange.min,
                xRange.max
            );

        const ny =
            normalize(
                y,
                yRange.min,
                yRange.max
            );


        /*
         * Geographic coordinates have
         * north at the top.
         *
         * Therefore latitude needs
         * to be inverted.
         */

        const displayY =
            currentMode === "geo"
                ? 1 - ny
                : 1 - ny;


        const px =
            PADDING +
            nx *
            (
                width -
                IMAGE_SIZE -
                PADDING * 2
            );


        const py =
            PADDING +
            displayY *
            (
                height -
                IMAGE_SIZE -
                PADDING * 2
            );


        image.element.style.left =
            `${px}px`;

        image.element.style.top =
            `${py}px`;
    }
}


/* --------------------------------------------------
   Switch mode
-------------------------------------------------- */

function setMode(mode) {

    if (mode === currentMode)
        return;

    currentMode =
        mode;


    embeddingButton.classList.toggle(
        "active",
        mode === "embedding"
    );

    geoButton.classList.toggle(
        "active",
        mode === "geo"
    );


    positionImages();
}


/* --------------------------------------------------
   Image information
-------------------------------------------------- */

function showInfo(image) {

    info.classList.remove(
        "hidden"
    );

    info.innerHTML = `

        <strong>
            ${escapeHTML(image.filename)}
        </strong>

        <br><br>

        Latitude:
        ${image.latitude ?? "—"}

        <br>

        Longitude:
        ${image.longitude ?? "—"}

        <br><br>

        Embedding:
        ${image.embedding_x?.toFixed(3) ?? "—"},
        ${image.embedding_y?.toFixed(3) ?? "—"}

    `;
}


/* --------------------------------------------------
   Escape HTML
-------------------------------------------------- */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* --------------------------------------------------
   Events
-------------------------------------------------- */

embeddingButton.addEventListener(
    "click",
    () => setMode("embedding")
);


geoButton.addEventListener(
    "click",
    () => setMode("geo")
);


window.addEventListener(
    "resize",
    positionImages
);


/* --------------------------------------------------
   Start
-------------------------------------------------- */

loadData()
    .catch(error => {

        console.error(error);

        imageCount.textContent =
            "Error loading images";
    });
