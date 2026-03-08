var loaded = false;
var handOpenLevel = 0; 
var handPosX = window.innerWidth / 2;
var handPosY = window.innerHeight / 2;

var init = function () {
    if (loaded) return;
    loaded = true;

    var canvas = document.getElementById('heart');
    var ctx = canvas.getContext('2d');
    var width = canvas.width = window.innerWidth;
    var height = canvas.height = window.innerHeight;
    var rand = Math.random;

    var heartPosition = function (rad) {
        return [Math.pow(Math.sin(rad), 3), -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad))];
    };

    var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
        return [dx + pos[0] * sx, dy + pos[1] * sy];
    };

    window.addEventListener('resize', function () {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    var pointsOrigin = [];
    var dr = 0.1;
    for (var i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), 210, 13, 0, 0));
    for (var i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), 150, 9, 0, 0));
    for (var i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), 90, 5, 0, 0));
    var heartPointsCount = pointsOrigin.length;

    var targetPoints = [];
    var pulse = function (kx, ky) {
        for (var i = 0; i < pointsOrigin.length; i++) {
            targetPoints[i] = [];
            targetPoints[i][0] = kx * pointsOrigin[i][0] + handPosX;
            targetPoints[i][1] = ky * pointsOrigin[i][1] + handPosY;
        }
    };

    var e = [];
    for (var i = 0; i < heartPointsCount; i++) {
        var x = rand() * width;
        var y = rand() * height;
        e[i] = {
            vx: 0, vy: 0, R: 2, speed: rand() + 5,
            q: ~~(rand() * heartPointsCount),
            D: 2 * (i % 2) - 1,
            force: 0.2 * rand() + 0.7,
            f: "hsla(0," + ~~(40 * rand() + 60) + "%," + ~~(60 * rand() + 20) + "%,.3)",
            trace: []
        };
        for (var k = 0; k < 40; k++) e[i].trace[k] = {x: x, y: y};
    }

    var config = { traceK: 0.4 };

    var loop = function () {
        pulse(handOpenLevel, handOpenLevel);
        ctx.fillStyle = "rgba(0,0,0,.15)";
        ctx.fillRect(0, 0, width, height);

        for (var i = e.length; i--;) {
            var u = e[i];
            var q = targetPoints[u.q];
            var dx = u.trace[0].x - q[0];
            var dy = u.trace[0].y - q[1];
            var length = Math.sqrt(dx * dx + dy * dy);
            if (10 > length) {
                if (0.95 < rand()) u.q = ~~(rand() * heartPointsCount);
                else {
                    if (0.99 < rand()) u.D *= -1;
                    u.q += u.D;
                    u.q %= heartPointsCount;
                    if (0 > u.q) u.q += heartPointsCount;
                }
            }
            u.vx += -dx / length * u.speed;
            u.vy += -dy / length * u.speed;
            u.trace[0].x += u.vx;
            u.trace[0].y += u.vy;
            u.vx *= u.force;
            u.vy *= u.force;
            for (var k = 0; k < u.trace.length - 1;) {
                var T = u.trace[k];
                var N = u.trace[++k];
                N.x -= config.traceK * (N.x - T.x);
                N.y -= config.traceK * (N.y - T.y);
            }
            ctx.fillStyle = u.f;
            for (var k = 0; k < u.trace.length; k++) {
                ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
            }
        }
        window.requestAnimationFrame(loop);
    };
    loop();
};

// --- PHẦN XỬ LÝ CAMERA VÀ AI ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Cập nhật vị trí lòng bàn tay và LẬT NGƯỢC X (Mirror) để khớp với cam trước
        handPosX = (1 - landmarks[9].x) * window.innerWidth; 
        handPosY = landmarks[9].y * window.innerHeight;

        // Tính độ mở tay
        const d = Math.sqrt(Math.pow(landmarks[12].x - landmarks[0].x, 2) + Math.pow(landmarks[12].y - landmarks[0].y, 2));
        handOpenLevel = Math.min(Math.max((d - 0.1) / 0.4, 0), 1.3); 
    } else {
        handOpenLevel = Math.max(0, handOpenLevel - 0.05); // Thu nhỏ dần khi mất tay
    }
});

// Thiết lập Camera TRƯỚC (FacingMode: user)
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    facingMode: 'user', // Ưu tiên cam trước
    width: 1280,
    height: 720
});

// Bắt đầu chạy
camera.start().catch(err => {
    alert("Lỗi Camera: Hãy đảm bảo bạn dùng HTTPS hoặc Local Server!");
    console.error(err);
});

if (document.readyState === 'complete') init();
else document.addEventListener('DOMContentLoaded', init);
