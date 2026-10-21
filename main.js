import { createProceduralDust } from './procedural-dust.js';
function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`Synqloud scene is missing ${selector}`);
    return element;
}
const host = requireElement('.synqloud');
const canvas = requireElement('.synqloud-stars');
const context = canvas.getContext('2d');
const dust = createProceduralDust(host);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let elapsed = 0;
let renewed = 0;
function makeStar(randomAge = false) {
    const lifetime = 40000 + Math.random() * 50000;
    return { x: Math.random(), y: Math.random(), radius: .4 + Math.random() ** 2 * 1.1, brightness: .28 + Math.random() * .5, phase: Math.random() * Math.PI * 2, period: 12000 + Math.random() * 16000, lifetime, born: elapsed - (randomAge ? Math.random() * lifetime : 0) };
}
const stars = Array.from({ length: 52 }, () => makeStar(true));
let previous = 0;
let frame = 0;
let width = 1;
let height = 1;
function drawStars() {
    if (!context)
        return;
    context.clearRect(0, 0, width, height);
    for (const star of stars) {
        if (elapsed - star.born >= star.lifetime) {
            Object.assign(star, makeStar());
            renewed++;
        }
        const life = Math.sin(Math.PI * Math.max(0, Math.min(1, (elapsed - star.born) / star.lifetime))) ** .75;
        const pulse = .5 + .5 * Math.sin(elapsed * Math.PI * 2 / star.period + star.phase);
        const opacity = star.brightness * life * (.4 + .6 * pulse);
        if (star.radius > 1.15) {
            const x = star.x * width, y = star.y * height;
            const halo = context.createRadialGradient(x, y, 0, x, y, star.radius * 4);
            halo.addColorStop(0, `rgba(177,213,250,${opacity * .28})`);
            halo.addColorStop(1, 'rgba(177,213,250,0)');
            context.fillStyle = halo;
            context.beginPath();
            context.arc(x, y, star.radius * 4, 0, Math.PI * 2);
            context.fill();
        }
        context.fillStyle = `rgba(211,230,251,${opacity})`;
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        context.fill();
    }
    canvas.dataset.time = (elapsed / 1000).toFixed(3);
    canvas.dataset.renewed = String(renewed);
}
function step(time) {
    frame = 0;
    if (reducedMotion.matches || document.hidden)
        return;
    if (!previous)
        previous = time;
    if (time - previous >= 40) {
        elapsed += time - previous;
        previous = time;
        dust.draw(elapsed);
        drawStars();
    }
    frame = requestAnimationFrame(step);
}
function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    const stopped = reducedMotion.matches;
    host.dataset.motion = stopped || document.hidden ? 'paused' : 'running';
    if (!stopped && !document.hidden)
        frame = requestAnimationFrame(step);
}
function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawStars();
}
document.addEventListener('visibilitychange', syncMotion);
reducedMotion.addEventListener('change', syncMotion);
const observer = new ResizeObserver(resize);
observer.observe(host);
dust.setActive(true);
dust.draw(0);
resize();
syncMotion();
window.addEventListener('pagehide', event => {
    cancelAnimationFrame(frame);
    if (!event.persisted) {
        observer.disconnect();
        dust.dispose();
    }
});
window.addEventListener('pageshow', syncMotion);
