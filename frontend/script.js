const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

const captureButton =
    document.getElementById("captureButton");

const switchCameraButton =
    document.getElementById("switchCamera");

const previewSection =
    document.getElementById("previewSection");

const photoPreview =
    document.getElementById("photoPreview");

const retakeButton =
    document.getElementById("retakeButton");

const saveButton =
    document.getElementById("saveButton");

const countdownOverlay =
    document.getElementById("countdownOverlay");

const countdownNumber =
    document.getElementById("countdownNumber");

const filterButtons =
    document.querySelectorAll(".filter");

const galleryGrid =
    document.getElementById("galleryGrid");

const galleryEmpty =
    document.getElementById("galleryEmpty");
let currentStream = null;

let currentFacingMode = "user";

let currentFilter = "none";

let isCountingDown = false;

const focusBox =
    document.getElementById("focusBox");

let focusTimeout = null;

/* =========================
   EXPOSURE
========================= */

const cameraFrame =
    document.querySelector(".camera-frame");

const exposureControl =
    document.getElementById("exposureControl");

const exposureValue =
    document.getElementById("exposureValue");

const exposureHint =
    document.getElementById("exposureHint");

let exposure = 0;

let isAdjustingExposure = false;

let exposureStartY = 0;

let exposureStartValue = 0;


/* =========================
   TAP TO FOCUS
========================= */

video.addEventListener("click", async (event) => {

    if (isCountingDown) return;

    const rect =
        video.getBoundingClientRect();


    /* Posisi tap */

    const x =
        event.clientX - rect.left;

    const y =
        event.clientY - rect.top;


    /* Tampilkan focus box */

    focusBox.style.left =
        `${x}px`;

    focusBox.style.top =
        `${y}px`;

    focusBox.classList.remove("focused");

    void focusBox.offsetWidth;

    focusBox.classList.add("show");


    /* Coba fokus kamera */

    await setCameraFocus(
        x,
        y
    );

    /* =========================
   TAP + SWIPE EXPOSURE
========================= */

cameraFrame.addEventListener(
    "pointerdown",
    async (event) => {

        if (isCountingDown) return;

        /*
         * Jangan aktif jika yang disentuh
         * adalah tombol / filter
         */

        if (
            event.target.closest("button") ||
            event.target.closest(".filters")
        ) {
            return;
        }


        const rect =
            video.getBoundingClientRect();


        /*
         * Posisi tap
         */

        const x =
            event.clientX - rect.left;

        const y =
            event.clientY - rect.top;


        /*
         * Simpan posisi awal swipe
         */

        exposureStartY =
            event.clientY;

        exposureStartValue =
            exposure;


        isAdjustingExposure = true;


        /*
         * Pindahkan indikator exposure
         * ke posisi tap
         */

        if (exposureControl) {

            exposureControl.style.left =
                `${x}px`;

            exposureControl.style.top =
                `${y}px`;

            exposureControl.classList.add(
                "show"
            );

        }


        /*
         * Tampilkan hint
         */

        if (exposureHint) {

            exposureHint.classList.add(
                "show"
            );

        }


        /*
         * Tetap jalankan TAP TO FOCUS
         */

        await setCameraFocus(
            x,
            y
        );

    }
);

cameraFrame.addEventListener(
    "pointermove",
    (event) => {

        if (!isAdjustingExposure) return;


        /*
         * Hitung jarak swipe
         *
         * Atas  = positif
         * Bawah = negatif
         */

        const difference =
            exposureStartY -
            event.clientY;


        /*
         * Setiap 50px
         * = perubahan 0.5
         */

        let newExposure =
            exposureStartValue +
            (difference / 100);


        /*
         * Batasi:
         *
         * -3 = paling gelap
         *  0 = normal
         * +3 = paling terang
         */

        newExposure =
            Math.max(
                -3,
                Math.min(
                    3,
                    newExposure
                )
            );


        exposure =
            Math.round(
                newExposure * 10
            ) / 10;


        updateExposure();


        /*
         * Jangan biarkan browser
         * melakukan scroll saat swipe
         */

        event.preventDefault();

    }
);

function updateExposure() {

    /*
     * Update angka
     */

    if (exposure > 0) {

        exposureValue.textContent =
            `+${exposure.toFixed(1)}`;

    } else {

        exposureValue.textContent =
            exposure.toFixed(1);

    }


    /*
     * Update kamera
     */

    applyLiveFilter();

}

cameraFrame.addEventListener(
    "pointerup",
    () => {

        isAdjustingExposure = false;


        setTimeout(() => {

            if (exposureHint) {

                exposureHint.classList.remove(
                    "show"
                );

            }

        }, 1200);

    }
);


cameraFrame.addEventListener(
    "pointercancel",
    () => {

        isAdjustingExposure = false;

    }
);

    /* Animasi focus */

    focusBox.classList.add(
        "focused"
    );


    /* Hilangkan setelah 1.8 detik */

    clearTimeout(
        focusTimeout
    );

    focusTimeout =
        setTimeout(() => {

            focusBox.classList.remove(
                "show"
            );

        }, 1800);

});


/* =========================
   CAMERA FOCUS
========================= */

async function setCameraFocus(x, y) {

    if (!currentStream) return;


    const track =
        currentStream.getVideoTracks()[0];

    if (!track) return;


    const capabilities =
        track.getCapabilities();


    /*
       Cek apakah kamera
       mendukung focus control
    */

    if (
        !capabilities.focusMode &&
        !capabilities.pointsOfInterest
    ) {

        console.log(
            "Camera tidak mendukung manual focus."
        );

        return;

    }


    const rect =
        video.getBoundingClientRect();


    /*
       Convert posisi tap
       menjadi 0 - 1
    */

    const pointX =
        Math.max(
            0,
            Math.min(
                1,
                x / rect.width
            )
        );

    const pointY =
        Math.max(
            0,
            Math.min(
                1,
                y / rect.height
            )
        );


    try {

        const constraints = {
            advanced: []
        };


        /*
           Continuous autofocus
        */

        if (
            capabilities.focusMode &&
            capabilities.focusMode.includes(
                "continuous"
            )
        ) {

            constraints.advanced.push({

                focusMode:
                    "continuous"

            });

        }


        /*
           Tap focus point
        */

        if (
            capabilities.pointsOfInterest
        ) {

            constraints.advanced.push({

                pointsOfInterest: [

                    {
                        x: pointX,
                        y: pointY
                    }

                ]

            });

        }


        await track.applyConstraints(
            constraints
        );


        console.log(
            "Focus applied:",
            pointX,
            pointY
        );


    } catch (error) {

        console.warn(
            "Focus tidak bisa diterapkan:",
            error
        );

    }

}

function updateCameraMirror() {

    if (currentFacingMode === "user") {

        video.style.transform = "scaleX(-1)";

    } else {

        video.style.transform = "scaleX(1)";

    }

}

/* =========================
   FILTER CONFIG
========================= */

const filters = {

    /* =========================
       ORIGINAL
    ========================= */

    none:
        "none",


    /* =========================
       FUJI SOFT
       Creamy + warm + clean
    ========================= */

    fuji:
        "brightness(1.04) contrast(0.96) saturate(1.08) sepia(0.025) blur(0.10px)",


    /* =========================
       DREAM GLOW
       Bright + dreamy + soft pink
    ========================= */

    dream:
        "brightness(1.10) contrast(0.94) saturate(1.04) sepia(0.04) blur(0.12px)",


    /* =========================
       WEDDING GOLD
       Champagne + elegant
    ========================= */

    weddingGold:
        "brightness(1.08) contrast(0.94) saturate(0.94) sepia(0.08)",


    /* =========================
       OVER EXPOSURE
       Bright flash but skin stays warm
    ========================= */

    overexposure:
        "brightness(1.32) contrast(0.88) saturate(0.92) sepia(0.025) blur(0.12px)",


    /* =========================
       DIAMOND SOFT
       Bright + polished skin
    ========================= */

    diamond:
        "brightness(1.12) contrast(0.90) saturate(0.96) blur(0.20px)",


    /* =========================
       FROST SOFT LENS
       Cool + clean
    ========================= */

    frost:
        "brightness(1.08) contrast(0.88) saturate(0.84) hue-rotate(8deg) blur(0.30px)",


    /* =========================
       LEAK 1
       Warm film + romantic
    ========================= */

    leak1:
        "brightness(1.08) contrast(0.94) saturate(1.10) sepia(0.12) hue-rotate(-8deg)"

};


/* =========================
   BEAUTY STRENGTH
========================= */

const beautyStrength = {

    none: 0,

    fuji: 1.00,

    dream: 1.08,

    weddingGold: 0.95,

    overexposure: 0.78,

    diamond: 1.12,

    frost: 0.82,

    leak1: 0.98

};

/* =========================
   START CAMERA
========================= */

async function startCamera() {

    try {

        if (currentStream) {

            currentStream
                .getTracks()
                .forEach(track => track.stop());

        }


        currentStream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode:
                        currentFacingMode,

                    width: {
                        ideal: 1080
                    },

                    height: {
                        ideal: 1440
                    }

                },

                audio: false

            });


        video.srcObject = currentStream;

        updateCameraMirror();

        applyLiveFilter();


    } catch (error) {

        console.error(error);

        alert(
            "Camera tidak dapat diakses. Pastikan izin kamera sudah diberikan."
        );

    }

}


/* =========================
   LIVE FILTER
========================= */

function applyLiveFilter() {

    const exposureBrightness =
        1 + (exposure * 0.12);

    const filter =
        filters[currentFilter];


    if (
        currentFilter === "none"
    ) {

        video.style.filter = `
            brightness(${exposureBrightness})
        `;

        return;

    }


    video.style.filter = `
        ${filter}
        brightness(${exposureBrightness})
    `;

}


/* =========================
   SELECT FILTER
========================= */

filterButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            filterButtons.forEach(btn => {

                btn.classList.remove("active");

            });


            button.classList.add("active");


            currentFilter =
                button.dataset.filter;


            applyLiveFilter();

        }
    );

});


/* =========================
   SWITCH CAMERA
========================= */

switchCameraButton.addEventListener(
    "click",
    () => {

        if (isCountingDown) return;


        currentFacingMode =
            currentFacingMode === "user"
                ? "environment"
                : "user";


        startCamera();

    }
);


/* =========================
   CAPTURE BUTTON
========================= */

captureButton.addEventListener(
    "click",
    () => {

        if (isCountingDown) return;

        startCountdown();

    }
);


/* =========================
   COUNTDOWN
========================= */

function startCountdown() {

    isCountingDown = true;

    countdownOverlay.style.display = "flex";


    let count = 3;

    countdownNumber.textContent = count;


    countdownNumber.style.animation =
        "none";


    void countdownNumber.offsetWidth;


    countdownNumber.style.animation =
        "countdownPulse 1s ease";


    const interval =
        setInterval(() => {

            count--;


            if (count > 0) {

                countdownNumber.textContent =
                    count;


                countdownNumber.style.animation =
                    "none";


                void countdownNumber.offsetWidth;


                countdownNumber.style.animation =
                    "countdownPulse 1s ease";


            }


            if (count === 0) {

                clearInterval(interval);


                countdownOverlay.style.display =
                    "none";


                takePhoto();


                isCountingDown = false;

            }

        }, 1000);

}


/* =========================
   TAKE PHOTO
========================= */

function takePhoto() {

    const width =
        video.videoWidth;

    const height =
        video.videoHeight;


    canvas.width =
        width;

    canvas.height =
        height;


    const context =
        canvas.getContext("2d");


    /* =========================
       MIRROR FRONT CAMERA
    ========================= */

    if (
        currentFacingMode === "user"
    ) {

        context.translate(
            width,
            0
        );

        context.scale(
            -1,
            1
        );

    }


    /* =========================
       EXPOSURE
    ========================= */

    const exposureBrightness =
        1 + (exposure * 0.12);


    /* =========================
       APPLY FILTER TO CANVAS
    ========================= */

    let canvasFilter =
        filters[currentFilter];


    /*
     * "none" tidak boleh digabung
     * dengan filter lain.
     */

    if (
        currentFilter === "none"
    ) {

        canvasFilter =
            `brightness(${exposureBrightness})`;

    } else {

        canvasFilter = `
            ${canvasFilter}
            brightness(${exposureBrightness})
        `;

    }


    /*
     * Terapkan filter ke CANVAS,
     * bukan cuma ke video.
     */

    context.filter =
        canvasFilter;


    /* =========================
       DRAW ORIGINAL VIDEO
    ========================= */

    context.drawImage(
        video,
        0,
        0,
        width,
        height
    );


    /* =========================
       RESET CANVAS STATE
    ========================= */

    context.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
    );

    context.filter =
        "none";


    /* =========================
   UNIVERSAL BEAUTY GRADE
========================= */

if (
    currentFilter !== "none"
) {

    applyUniversalBeautyGrade(
        context,
        width,
        height,
        beautyStrength[currentFilter] || 1
    );

}


/* =========================
   WEDDING GOLD COLOR GRADE
========================= */

if (
    currentFilter === "weddingGold"
) {

    applyWeddingGoldGrade(
        context,
        width,
        height
    );

}


    /* =========================
       GOLD FRAME
    ========================= */

    drawWeddingFrame(
        context,
        width,
        height
    );


    /* =========================
       EXPORT
    ========================= */

    const imageData =
        canvas.toDataURL(
            "image/jpeg",
            0.92
        );


    photoPreview.src =
        imageData;


    /* =========================
       SHOW PREVIEW
    ========================= */

    previewSection.style.display =
        "block";


    previewSection.scrollIntoView({
        behavior: "smooth"
    });

}


/* =========================
   DRAW WEDDING FRAME
========================= */

function drawWeddingFrame(
    ctx,
    width,
    height
) {

    const gold =
        "#C6A15B";


    const lightGold =
        "rgba(255,255,255,0.8)";


    /*
        OUTER BORDER
    */

    ctx.strokeStyle = gold;

    ctx.lineWidth = 5;

    ctx.strokeRect(
        18,
        18,
        width - 36,
        height - 36
    );


    /*
        INNER BORDER
    */

    ctx.strokeStyle =
        lightGold;

    ctx.lineWidth = 2;

    ctx.strokeRect(
        30,
        30,
        width - 60,
        height - 60
    );


    /*
        DECORATIVE CORNERS
    */

    drawCorner(
        ctx,
        25,
        25,
        1,
        1
    );


    drawCorner(
        ctx,
        width - 25,
        25,
        -1,
        1
    );


    drawCorner(
        ctx,
        25,
        height - 25,
        1,
        -1
    );


    drawCorner(
        ctx,
        width - 25,
        height - 25,
        -1,
        -1
    );

}


/* =========================
   GOLD CORNER ORNAMENT
========================= */

function drawCorner(
    ctx,
    x,
    y,
    directionX,
    directionY
) {

    ctx.save();


    ctx.translate(
        x,
        y
    );


    ctx.scale(
        directionX,
        directionY
    );


    ctx.strokeStyle =
        "#C6A15B";


    ctx.lineWidth = 4;


    ctx.beginPath();


    /*
        Main curve
    */

    ctx.moveTo(
        0,
        0
    );


    ctx.lineTo(
        75,
        0
    );


    ctx.bezierCurveTo(
        50,
        0,
        45,
        25,
        65,
        30
    );


    ctx.bezierCurveTo(
        85,
        35,
        85,
        10,
        68,
        10
    );


    ctx.stroke();


    /*
        Small flourish
    */

    ctx.beginPath();

    ctx.arc(
        40,
        38,
        12,
        0,
        Math.PI * 1.5
    );

    ctx.stroke();


    /*
        Sparkle
    */

    ctx.fillStyle =
        "#C6A15B";


    ctx.beginPath();

    ctx.arc(
        78,
        4,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.restore();

}

/* =========================
   WEDDING GOLD COLOR GRADING
   Broken White + Champagne Gold
========================= */

function applyWeddingGoldGrade(ctx, width, height) {

    const imageData = ctx.getImageData(
        0,
        0,
        width,
        height
    );

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        /* =========================
           LUMINANCE
        ========================= */

        const luminance =
            (0.299 * r) +
            (0.587 * g) +
            (0.114 * b);


        /* =========================
           SOFT CONTRAST
        ========================= */

        r = ((r - 128) * 0.94) + 128;
        g = ((g - 128) * 0.94) + 128;
        b = ((b - 128) * 0.94) + 128;


        /* =========================
           BROKEN WHITE
        ========================= */

        if (luminance > 155) {

            const highlight =
                (luminance - 155) / 100;

            r += highlight * 8;
            g += highlight * 6;
            b += highlight * 3;
        }


        /* =========================
           CHAMPAGNE GOLD
        ========================= */

        if (luminance > 120) {

            const warm =
                (luminance - 120) / 135;

            r += warm * 5;
            g += warm * 2;
            b -= warm * 3;
        }


        /* =========================
           SHADOW PROTECTION
        ========================= */

        if (luminance < 90) {

            const shadow =
                (90 - luminance) / 90;

            r += shadow * 2;
            g += shadow * 1;
            b += shadow * 1;
        }


        /* =========================
           SOFT DESATURATION
        ========================= */

        const gray =
            (r + g + b) / 3;

        r = r * 0.94 + gray * 0.06;
        g = g * 0.94 + gray * 0.06;
        b = b * 0.94 + gray * 0.06;


        /* =========================
           GREEN CONTROL
        ========================= */

        if (
            g > r * 1.15 &&
            g > b * 1.10
        ) {

            g *= 0.94;
            r *= 1.01;
        }


        /* =========================
           SKIN TONE PROTECTION
        ========================= */

        if (
            r > g * 1.08 &&
            r > b * 1.15 &&
            luminance > 80
        ) {

            r *= 1.015;
            g *= 1.005;
        }


        /* =========================
           SOFT HIGHLIGHT GLOW
        ========================= */

        if (luminance > 185) {

            const glow =
                (luminance - 185) / 70;

            r += glow * 3;
            g += glow * 3;
            b += glow * 2;
        }


        /* =========================
           CLAMP
        ========================= */

        data[i] =
            Math.max(0, Math.min(255, r));

        data[i + 1] =
            Math.max(0, Math.min(255, g));

        data[i + 2] =
            Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(
        imageData,
        0,
        0
    );
}

/* =========================
   UNIVERSAL BEAUTY GRADE
   Creamy Skin + Makeup
   Natural Wedding Look
========================= */

function applyUniversalBeautyGrade(
    ctx,
    width,
    height,
    strength = 1
) {

    if (strength <= 0) return;


    const imageData =
        ctx.getImageData(
            0,
            0,
            width,
            height
        );


    const data =
        imageData.data;


    for (
        let i = 0;
        i < data.length;
        i += 4
    ) {

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];


        /* =========================
           LUMINANCE
        ========================= */

        const luminance =
            (0.299 * r) +
            (0.587 * g) +
            (0.114 * b);


        /* =========================
           NATURAL SKIN DETECTION
        ========================= */

        const isSkin =
            r > 70 &&
            g > 35 &&
            b > 20 &&
            r > g * 1.06 &&
            g > b * 1.03 &&
            r - b > 20;


        if (isSkin) {

            /* =========================
               CREAMY SKIN
            ========================= */

            const average =
                (r + g + b) / 3;


            /*
             * Sedikit neutralisasi warna kulit.
             *
             * Tidak dibuat terlalu rata
             * supaya tekstur wajah tetap ada.
             */

            const creamAmount =
                0.055 * strength;


            r =
                r * (1 - creamAmount) +
                average * creamAmount;

            g =
                g * (1 - creamAmount) +
                average * creamAmount;

            b =
                b * (1 - creamAmount) +
                average * creamAmount;


            /* =========================
               WARM CREAM
            ========================= */

            r += 2.2 * strength;
            g += 0.9 * strength;
            b -= 0.7 * strength;


            /* =========================
               SOFT SKIN LIFT
            ========================= */

            if (luminance > 75) {

                const lift =
                    Math.min(
                        1,
                        (luminance - 75) / 180
                    );


                r +=
                    lift *
                    2.0 *
                    strength;

                g +=
                    lift *
                    1.4 *
                    strength;

                b +=
                    lift *
                    0.8 *
                    strength;

            }


            /* =========================
               BLUSH ENHANCEMENT
            ========================= */

            /*
             * Mendeteksi warna kulit
             * yang sudah memiliki red/pink.
             *
             * Kita boost sedikit saja.
             */

            const blushArea =
                r > g * 1.12 &&
                r > b * 1.16 &&
                luminance > 75 &&
                luminance < 210;


            if (blushArea) {

                r +=
                    4.2 *
                    strength;

                g -=
                    0.8 *
                    strength;

                b -=
                    1.0 *
                    strength;

            }


            /* =========================
               LIP / DEEP PINK ENHANCEMENT
            ========================= */

            const lipArea =
                r > 90 &&
                r > g * 1.18 &&
                r > b * 1.20 &&
                luminance < 175;


            if (lipArea) {

                r +=
                    6.5 *
                    strength;

                g -=
                    1.2 *
                    strength;

                b -=
                    1.8 *
                    strength;

            }

        }


        /* =========================
           GREEN CAST CONTROL
        ========================= */

        if (
            g > r * 1.10 &&
            g > b * 1.12
        ) {

            g -=
                1.8 *
                strength;

            r +=
                0.5 *
                strength;

        }


        /* =========================
           NATURAL SOFT CONTRAST
        ========================= */

        const contrast =
            0.985;


        r =
            ((r - 128) * contrast) + 128;

        g =
            ((g - 128) * contrast) + 128;

        b =
            ((b - 128) * contrast) + 128;


        /* =========================
           SOFT WARM HIGHLIGHT
        ========================= */

        if (luminance > 175) {

            const highlight =
                Math.min(
                    1,
                    (luminance - 175) / 80
                );


            r +=
                highlight *
                1.8 *
                strength;

            g +=
                highlight *
                1.1 *
                strength;

        }


        /* =========================
           CLAMP
        ========================= */

        data[i] =
            Math.max(
                0,
                Math.min(
                    255,
                    r
                )
            );


        data[i + 1] =
            Math.max(
                0,
                Math.min(
                    255,
                    g
                )
            );


        data[i + 2] =
            Math.max(
                0,
                Math.min(
                    255,
                    b
                )
            );

    }


    ctx.putImageData(
        imageData,
        0,
        0
    );

}

/* =========================
   RETAKE
========================= */

retakeButton.addEventListener(
    "click",
    () => {

        previewSection.style.display =
            "none";

    }
);

/* =========================
   GALLERY STORAGE
========================= */

const GALLERY_STORAGE_KEY =
    "weddingPhotoboothGallery";


function getGalleryPhotos() {

    const photos =
        localStorage.getItem(
            GALLERY_STORAGE_KEY
        );

    return photos
        ? JSON.parse(photos)
        : [];

}


function saveToGallery(imageData) {

    const photos =
        getGalleryPhotos();


    const photo = {

        id: Date.now(),

        image: imageData,

        date:
            new Date().toLocaleString()

    };


    photos.unshift(photo);


    /*
        Simpan ke browser
    */

    try {

        localStorage.setItem(
            GALLERY_STORAGE_KEY,
            JSON.stringify(photos)
        );

    } catch (error) {

        console.error(
            "Gallery storage penuh:",
            error
        );

        alert(
            "Penyimpanan gallery penuh. Silakan hapus beberapa foto terlebih dahulu."
        );

        return false;

    }


    renderGallery();

    return true;

}


/* =========================
   RENDER GALLERY
========================= */

function renderGallery() {

    if (!galleryGrid) return;


    const photos =
        getGalleryPhotos();


    galleryGrid.innerHTML = "";


    if (photos.length === 0) {

        galleryEmpty.style.display =
            "block";

        return;

    }


    galleryEmpty.style.display =
        "none";


    photos.forEach(photo => {

        const item =
            document.createElement("div");

        item.className =
            "gallery-item";


        const image =
            document.createElement("img");

        image.src =
            photo.image;

        image.alt =
            "Wedding moment";


        /*
            Delete button
        */

        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "gallery-delete";

        deleteButton.innerHTML =
            "×";

        deleteButton.setAttribute(
            "aria-label",
            "Delete photo"
        );


        deleteButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                deletePhoto(photo.id);

            }
        );


        /*
            Klik foto → fullscreen
        */

        image.addEventListener(
            "click",
            () => {

                openPhotoViewer(
                    photo.image
                );

            }
        );


        item.appendChild(image);

        item.appendChild(deleteButton);

        galleryGrid.appendChild(item);

    });

}


/* =========================
   DELETE PHOTO
========================= */

function deletePhoto(id) {

    const confirmed =
        confirm(
            "Hapus foto ini dari Our Moments?"
        );


    if (!confirmed) return;


    let photos =
        getGalleryPhotos();


    photos =
        photos.filter(
            photo =>
                photo.id !== id
        );


    localStorage.setItem(
        GALLERY_STORAGE_KEY,
        JSON.stringify(photos)
    );


    renderGallery();

}


/* =========================
   PHOTO VIEWER
========================= */

function openPhotoViewer(imageData) {

    const viewer =
        document.createElement("div");

    viewer.className =
        "photo-viewer";


    viewer.innerHTML = `

        <div class="viewer-content">

            <button class="viewer-close">
                ×
            </button>

            <img
                src="${imageData}"
                alt="Wedding photo"
            >

        </div>

    `;


    document.body.appendChild(
        viewer
    );


    viewer
        .querySelector(".viewer-close")
        .addEventListener(
            "click",
            () => {

                viewer.remove();

            }
        );


    viewer.addEventListener(
        "click",
        event => {

            if (
                event.target === viewer
            ) {

                viewer.remove();

            }

        }
    );

}


/* =========================
   SAVE PHOTO
========================= */

saveButton.addEventListener(
    "click",
    () => {

        const imageData =
            canvas.toDataURL(
                "image/jpeg",
                0.88
            );


        /*
            Simpan ke gallery
        */

        const saved =
            saveToGallery(
                imageData
            );


        if (!saved) return;


        /*
            Download ke device
        */

        const link =
            document.createElement("a");


        link.href =
            imageData;


        link.download =
            `wedding-photo-${Date.now()}.jpg`;


        link.click();


        /*
            Scroll ke gallery
        */

        setTimeout(() => {

            document
                .getElementById("gallery")
                .scrollIntoView({
                    behavior: "smooth"
                });

        }, 300);

    }
);

/* =========================
   INIT
========================= */

startCamera();

renderGallery();
