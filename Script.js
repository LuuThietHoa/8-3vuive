var loaded = false;
var handOpenLevel = 0; // 0: nắm, 1: mở
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
            // Gán tọa độ tim theo vị trí bàn tay handPosX, handPosY
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
        for (var k = 0; k < 50; k++) e[i].trace[k] = {x: x, y: y};
    }

    var config = { traceK: 0.4 };

    var loop = function () {
        // Trái tim co giãn theo độ mở của tay (handOpenLevel)
        pulse(handOpenLevel, handOpenLevel);

        ctx.fillStyle = "rgba(0,0,0,.1)";
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

// --- CÀI ĐẶT MEDIAPIPE HANDS ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Cập nhật vị trí lòng bàn tay (điểm số 9)
        // MediaPipe trả về giá trị 0-1 nên phải nhân với width/height
        handPosX = (1 - landmarks[9].x) * window.innerWidth; // Lật ngược x vì camera bị mirror
        handPosY = landmarks[9].y * window.innerHeight;

        // Tính độ mở bàn tay dựa trên khoảng cách ngón giữa (12) và cổ tay (0)
        const d = Math.sqrt(Math.pow(landmarks[12].x - landmarks[0].x, 2) + Math.pow(landmarks[12].y - landmarks[0].y, 2));
        
        // Điều chỉnh ngưỡng d (0.1 đến 0.45) để tim nở ra mượt mà
        handOpenLevel = Math.min(Math.max((d - 0.1) / 0.35, 0), 1.2); 
    } else {
        // Khi không thấy tay, cho tim thu nhỏ về 0
        handOpenLevel = 0;
    }
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720
});
camera.start();

// Khởi tạo hiệu ứng trái tim
if (document.readyState === 'complete') init();
else document.addEventListener('DOMContentLoaded', init);
