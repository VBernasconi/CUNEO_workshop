
const canvas =
    document.getElementById("canvas");

const visualButton =
    document.getElementById("visualButton");

const depthButton =
    document.getElementById("depthButton");

const geoButton =
    document.getElementById("geoButton");

const imageCount =
    document.getElementById("imageCount");

const info =
    document.getElementById("info");


const IMAGE_SIZE = 70;
const PADDING = 30;


/*
 * --------------------------------------------------
 * Current visualization
 *
 * "visual"
 * "depth"
 * "geo"
 * --------------------------------------------------
 */

let currentMode = "visual";

let images = [];

let zoom = 1;

let panX = 0;
let panY = 0;

let isDragging = false;

let dragStartX = 0;
let dragStartY = 0;

let startPanX = 0;
let startPanY = 0;


/*
 * --------------------------------------------------
 * CSV parser
 * --------------------------------------------------
 *
 * This handles quoted CSV fields, which is important
 * because your embedding columns may contain commas.
 * --------------------------------------------------
 */

function parseCSV(text) {

    const rows = [];

    let row = [];
    let field = "";

    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            field += '"';
            i++;
            continue;
        }

        if (char === '"') {

            insideQuotes =
                !insideQuotes;

            continue;
        }

        if (char === "," && !insideQuotes) {

            row.push(field);
            field = "";

            continue;
        }

        if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(field);

            if (
                row.length > 1 ||
                row[0] !== ""
            ) {
                rows.push(row);
            }

            row = [];
            field = "";

            continue;
        }

        field += char;
    }


    /*
     * Last field / row.
     */

    if (field !== "" || row.length > 0) {

        row.push(field);

        rows.push(row);
    }


    if (!rows.length)
        return [];


    const headers =
        rows[0].map(
            header => header.trim()
        );


    return rows
        .slice(1)
        .map(values => {

            const object = {};

            headers.forEach(
                (header, index) => {

                    object[header] =
                        values[index] ?? "";
                }
            );

            return object;
        });
}


/*
 * --------------------------------------------------
 * Parse embedding
 * --------------------------------------------------
 *
 * Supports:
 *
 * [0.1, 0.2, 0.3]
 *
 * "[0.1, 0.2, 0.3]"
 *
 * and whitespace-separated vectors.
 * --------------------------------------------------
 */

function parseEmbedding(value) {

    if (!value)
        return null;


    try {

        /*
         * First try JSON.
         */

        let cleaned =
            value.trim();


        /*
         * CSV sometimes produces an additional
         * layer of quotes.
         */

        if (
            cleaned.startsWith('"') &&
            cleaned.endsWith('"')
        ) {

            cleaned =
                cleaned.slice(
                    1,
                    -1
                );
        }


        const parsed =
            JSON.parse(cleaned);


        if (Array.isArray(parsed)) {

            const vector =
                parsed.map(Number);

            if (
                vector.length > 0 &&
                vector.every(
                    Number.isFinite
                )
            ) {
                return vector;
            }
        }

    } catch (error) {

        /*
         * Fall through to manual parser.
         */
    }


    /*
     * Remove brackets.
     */

    const cleaned =
        value
            .replace(/[\[\]]/g, "")
            .trim();


    if (!cleaned)
        return null;


    const vector =
        cleaned
            .split(/[\s,]+/)
            .map(Number)
            .filter(Number.isFinite);


    return vector.length
        ? vector
        : null;
}


/*
 * --------------------------------------------------
 * Load CSV
 * --------------------------------------------------
 */

async function loadData() {

    const response =
        await fetch(
            "MediaInventory_with_depth.csv"
        );


    if (!response.ok) {

        throw new Error(
            `Could not load CSV: ${response.status}`
        );
    }


    const text =
        await response.text();


    images =
        parseCSV(text);


    console.log(
        "Loaded images:",
        images.length
    );


    /*
     * Parse embeddings.
     */

    for (const image of images) {

        image.visualEmbedding =
            parseEmbedding(
                image.dinov2_embedding
            );

        image.depthEmbedding =
            parseEmbedding(
                image.depth_embedding
            );


        image.latitude =
            Number(image.latitude);

        image.longitude =
            Number(image.longitude);
    }


    imageCount.textContent =
        `${images.length} images`;


    /*
     * Calculate the two projections.
     */

    calculateProjection(
        "visual"
    );

    calculateProjection(
        "depth"
    );


    createImageElements();

    positionImages();
}


/*
 * --------------------------------------------------
 * PCA
 * --------------------------------------------------
 *
 * Reduces an N-dimensional embedding to 2 dimensions.
 *
 * This implementation uses power iteration to find
 * the first two principal components.
 * --------------------------------------------------
 */

function calculateProjection(mode) {

    const embeddingKey =
        mode === "visual"
            ? "visualEmbedding"
            : "depthEmbedding";


    const validImages =
        images.filter(
            image =>
                Array.isArray(
                    image[embeddingKey]
                )
        );


    if (!validImages.length) {

        console.warn(
            `No ${mode} embeddings found`
        );

        return;
    }


    /*
     * Make sure all vectors have the same dimension.
     */

    const dimensions =
        validImages[0][embeddingKey].length;


    const compatibleImages =
        validImages.filter(
            image =>
                image[embeddingKey].length ===
                dimensions
        );


    if (!compatibleImages.length)
        return;


    /*
     * Build matrix.
     */

    const matrix =
        compatibleImages.map(
            image =>
                image[embeddingKey]
                    .map(Number)
        );


    /*
     * Calculate mean.
     */

    const mean =
        new Array(dimensions).fill(0);


    for (const vector of matrix) {

        for (let i = 0; i < dimensions; i++) {

            mean[i] += vector[i];
        }
    }


    for (let i = 0; i < dimensions; i++) {

        mean[i] /=
            matrix.length;
    }


    /*
     * Center the vectors.
     */

    const centered =
        matrix.map(
            vector =>
                vector.map(
                    (value, i) =>
                        value - mean[i]
                )
        );


    /*
     * Covariance matrix.
     *
     * For very large DINO embeddings this can be
     * expensive, so we calculate matrix-vector
     * products directly instead of explicitly
     * constructing D x D covariance.
     */


    function covarianceMultiply(vector) {

        const result =
            new Array(dimensions).fill(0);


        for (const sample of centered) {

            let dot = 0;

            for (
                let i = 0;
                i < dimensions;
                i++
            ) {

                dot +=
                    sample[i] *
                    vector[i];
            }


            for (
                let i = 0;
                i < dimensions;
                i++
            ) {

                result[i] +=
                    sample[i] *
                    dot;
            }
        }


        const scale =
            1 /
            Math.max(
                1,
                centered.length - 1
            );


        for (
            let i = 0;
            i < dimensions;
            i++
        ) {

            result[i] *= scale;
        }


        return result;
    }


    /*
     * Normalize vector.
     */

    function normalizeVector(vector) {

        let length = 0;

        for (const value of vector) {

            length +=
                value * value;
        }


        length =
            Math.sqrt(length);


        if (length === 0)
            return vector;


        return vector.map(
            value =>
                value / length
        );
    }


    /*
     * Dot product.
     */

    function dot(a, b) {

        let result = 0;

        for (
            let i = 0;
            i < a.length;
            i++
        ) {

            result +=
                a[i] * b[i];
        }

        return result;
    }


    /*
     * Find principal component.
     */

    function findComponent(
        previousComponents = []
    ) {

        let vector =
            new Array(dimensions)
                .fill(0)
                .map(
                    (_, i) =>
                        Math.sin(i + 1)
                );


        vector =
            normalizeVector(vector);


        for (
            let iteration = 0;
            iteration < 100;
            iteration++
        ) {

            let next =
                covarianceMultiply(
                    vector
                );


            /*
             * Deflate against components already
             * discovered.
             */

            for (
                const component
                of previousComponents
            ) {

                const projection =
                    dot(
                        next,
                        component
                    );


                for (
                    let i = 0;
                    i < dimensions;
                    i++
                ) {

                    next[i] -=
                        projection *
                        component[i];
                }
            }


            vector =
                normalizeVector(next);
        }


        return vector;
    }


    /*
     * First two principal components.
     */

    const component1 =
        findComponent();


    const component2 =
        findComponent([
            component1
        ]);


    /*
     * Project every image.
     */

    for (const image of compatibleImages) {

        const vector =
            image[embeddingKey];


        let x = 0;
        let y = 0;


        for (
            let i = 0;
            i < dimensions;
            i++
        ) {

            const value =
                vector[i] -
                mean[i];


            x +=
                value *
                component1[i];


            y +=
                value *
                component2[i];
        }


        image[`${mode}X`] =
            x;

        image[`${mode}Y`] =
            y;
    }


    console.log(
        `${mode} PCA calculated`,
        dimensions,
        "dimensions → 2 dimensions"
    );
}

/*
 * --------------------------------------------------
 * Create thumbnails
 * --------------------------------------------------
 */
function getMainThumbnailPath(image) {

    const filename =
        image.filename.trim();

    const baseName =
        filename.replace(
            /\.[^/.]+$/,
            ""
        );

    return `/data/${encodeURIComponent(
        baseName
    )}.jpg`;
}


function getDepthThumbnailPath(image) {

    const filename =
        image.filename.trim();

    const baseName =
        filename.replace(
            /\.[^/.]+$/,
            ""
        );

    return `/data/DEPTH_IMAGES/${encodeURIComponent(
        baseName
    )}_depth.png`;
}


function createImageElements() {

    canvas.innerHTML = "";


    for (const image of images) {

        /*
         * --------------------------------------------------
         * Container
         * --------------------------------------------------
         *
         * We use a container so that the normal image and
         * depth image can be layered on top of each other.
         */

        const container =
            document.createElement("div");

        container.className =
            "image-tile";


        /*
         * --------------------------------------------------
         * Main image
         * --------------------------------------------------
         */

        const mainImage =
            document.createElement("img");

        mainImage.className =
            "main-image";

        mainImage.src =
            getMainThumbnailPath(image);

        mainImage.alt =
            image.filename;


        /*
         * --------------------------------------------------
         * Depth image
         * --------------------------------------------------
         */

        const depthImage =
            document.createElement("img");

        depthImage.className =
            "depth-image";

        depthImage.src =
            getDepthThumbnailPath(image);

        depthImage.alt =
            `${image.filename} depth`;

        depthImage.loading =
            "lazy";


        /*
         * --------------------------------------------------
         * Put both images inside the tile.
         * --------------------------------------------------
         */

        container.appendChild(
            mainImage
        );

        container.appendChild(
            depthImage
        );


        /*
         * --------------------------------------------------
         * Click
         * --------------------------------------------------
         */

        container.addEventListener(
            "click",
            () => showInfo(image)
        );


        /*
         * --------------------------------------------------
         * Debug missing thumbnails
         * --------------------------------------------------
         */

        mainImage.addEventListener(
            "error",
            () => {

                console.warn(
                    "Could not load image:",
                    mainImage.src
                );

            }
        );


        depthImage.addEventListener(
            "error",
            () => {

                console.warn(
                    "Could not load depth image:",
                    depthImage.src
                );

            }
        );


        canvas.appendChild(
            container
        );


        image.element =
            container;
    }
}

/*
 * --------------------------------------------------
 * Calculate coordinate range
 * --------------------------------------------------
 */

function getRange(values) {

    const valid =
        values.filter(
            Number.isFinite
        );


    if (!valid.length) {

        return {
            min: 0,
            max: 1
        };
    }


    return {

        min: Math.min(...valid),

        max: Math.max(...valid)

    };
}


/*
 * --------------------------------------------------
 * Normalize
 * --------------------------------------------------
 */

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


/*
 * --------------------------------------------------
 * Position images
 * --------------------------------------------------
 */

function positionImages() {

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height)
        return;


    let xValues;
    let yValues;


    /*
     * Select projection.
     */

    if (currentMode === "visual") {

        xValues = images.map(
            image => image.visualX
        );

        yValues = images.map(
            image => image.visualY
        );

    } else if (currentMode === "depth") {

        xValues = images.map(
            image => image.depthX
        );

        yValues = images.map(
            image => image.depthY
        );

    } else {

        xValues = images
            .map(image => image.longitude)
            .filter(Number.isFinite);

        yValues = images
            .map(image => image.latitude)
            .filter(Number.isFinite);
    }


    const xRange = getRange(xValues);
    const yRange = getRange(yValues);


    /*
     * Use the ACTUAL visible canvas for every mode.
     *
     * Previously geo used width * 2.5 and height * 2.5,
     * which made geographic points spread over a huge
     * virtual area.
     */

    const availableWidth =
        width - IMAGE_SIZE - PADDING * 2;

    const availableHeight =
        height - IMAGE_SIZE - PADDING * 2;


    /*
     * Position every image.
     */

    for (const image of images) {

        let x;
        let y;


        if (currentMode === "visual") {

            x = image.visualX;
            y = image.visualY;

        } else if (currentMode === "depth") {

            x = image.depthX;
            y = image.depthY;

        } else {

            x = image.longitude;
            y = image.latitude;
        }


        /*
         * Hide images without valid coordinates.
         */

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {

            image.element.style.display = "none";

            continue;
        }


        image.element.style.display = "block";


        /*
         * Normalize coordinates to 0 → 1.
         */

        const nx = normalize(
            x,
            xRange.min,
            xRange.max
        );

        const ny = normalize(
            y,
            yRange.min,
            yRange.max
        );


        /*
         * Convert to visible-canvas coordinates.
         */

        const virtualX =
            PADDING +
            nx * availableWidth;


        const virtualY =
            PADDING +
            (1 - ny) * availableHeight;


        /*
         * Apply zoom and pan.
         */

        const px =
            (
                virtualX -
                width / 2
            ) * zoom
            +
            width / 2
            +
            panX;


        const py =
            (
                virtualY -
                height / 2
            ) * zoom
            +
            height / 2
            +
            panY;


        image.element.style.left =
            `${px}px`;

        image.element.style.top =
            `${py}px`;
    }
}



/*
 * --------------------------------------------------
 * Switch mode
 * --------------------------------------------------
 */

function setMode(mode) {

    if (mode === currentMode)
        return;


    currentMode =
        mode;


    visualButton.classList.toggle(
        "active",
        mode === "visual"
    );


    depthButton.classList.toggle(
        "active",
        mode === "depth"
    );


    geoButton.classList.toggle(
        "active",
        mode === "geo"
    );


    /*
     * Update thumbnails.
     *
     * Visual / Geo:
     * /data/filename.jpg
     *
     * Depth:
     * /data/depth/filename_depth.jpg
     

    for (const image of images) {

        if (!image.element)
            continue;


        image.element.src =
            getThumbnailPath(image);
    } */


    /*
     * Reset navigation.
     */

    zoom = 1;

    panX = 0;

    panY = 0;


    positionImages();
}


/*
 * --------------------------------------------------
 * Image information
 * --------------------------------------------------
 */

function showInfo(image) {

    info.classList.remove(
        "hidden"
    );


    info.innerHTML = `

        <strong>
            ${escapeHTML(image.filename)}
        </strong>

        <br><br>

        Media type:
        ${escapeHTML(
            image.media_type || "—"
        )}

        <br><br>

        Timestamp:
        ${escapeHTML(
            image.timestamp || "—"
        )}

        <br><br>

        Latitude:
        ${Number.isFinite(image.latitude)
            ? image.latitude
            : "—"}

        <br>

        Longitude:
        ${Number.isFinite(image.longitude)
            ? image.longitude
            : "—"}

        <br><br>

        Visual projection:
        ${
            Number.isFinite(image.visualX)
                ? image.visualX.toFixed(3)
                : "—"
        },
        ${
            Number.isFinite(image.visualY)
                ? image.visualY.toFixed(3)
                : "—"
        }

        <br>

        Depth projection:
        ${
            Number.isFinite(image.depthX)
                ? image.depthX.toFixed(3)
                : "—"
        },
        ${
            Number.isFinite(image.depthY)
                ? image.depthY.toFixed(3)
                : "—"
        }

    `;
}


/*
 * --------------------------------------------------
 * Escape HTML
 * --------------------------------------------------
 */

function escapeHTML(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/*
 * --------------------------------------------------
 * Buttons
 * --------------------------------------------------
 */

visualButton.addEventListener(
    "click",
    () =>
        setMode("visual")
);


depthButton.addEventListener(
    "click",
    () =>
        setMode("depth")
);


geoButton.addEventListener(
    "click",
    () =>
        setMode("geo")
);


/*
 * --------------------------------------------------
 * Resize
 * --------------------------------------------------
 */

window.addEventListener(
    "resize",
    positionImages
);


/*
 * --------------------------------------------------
 * Zoom
 * --------------------------------------------------
 */

canvas.addEventListener(
    "wheel",
    event => {

        /*
         * Zoom is useful for all projections.
         */

        event.preventDefault();


        const oldZoom =
            zoom;


        if (event.deltaY < 0) {

            zoom *= 1.15;

        } else {

            zoom /= 1.15;
        }


        zoom =
            Math.max(
                0.5,
                Math.min(
                    zoom,
                    8
                )
            );


        /*
         * Zoom around mouse position.
         */

        const rect =
            canvas.getBoundingClientRect();


        const mouseX =
            event.clientX -
            rect.left -
            canvas.clientWidth / 2;


        const mouseY =
            event.clientY -
            rect.top -
            canvas.clientHeight / 2;


        const factor =
            zoom / oldZoom;


        panX =
            mouseX -
            (mouseX - panX) *
            factor;


        panY =
            mouseY -
            (mouseY - panY) *
            factor;


        positionImages();

    },
    {
        passive: false
    }
);


/*
 * --------------------------------------------------
 * Pan
 * --------------------------------------------------
 */

canvas.addEventListener(
    "mousedown",
    event => {

        /*
         * Don't pan when clicking an image.
         */

        if (
            event.target.closest(".image-tile")
        ) {
            return;
        }


        isDragging = true;

        dragStartX = event.clientX;
        dragStartY = event.clientY;

        startPanX = panX;
        startPanY = panY;

        canvas.style.cursor = "grabbing";
    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (!isDragging)
            return;


        panX =
            startPanX +
            (
                event.clientX -
                dragStartX
            );


        panY =
            startPanY +
            (
                event.clientY -
                dragStartY
            );


        positionImages();
    }
);


window.addEventListener(
    "mouseup",
    () => {

        isDragging = false;

        canvas.style.cursor =
            "grab";
    }
);


/*
 * --------------------------------------------------
 * Start
 * --------------------------------------------------
 */

loadData()
    .catch(error => {

        console.error(error);

        imageCount.textContent =
            "Error loading images";
    });

