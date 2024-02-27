import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import GUI from "lil-gui";
import { SUBTRACTION, Evaluator, Brush } from "three-bvh-csg";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import terrainVertexShader from "./shaders/terrain/vertex.glsl";
import terrainFragmentShader from "./shaders/terrain/fragment.glsl";
import Stats from "stats.js";

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 325 });
const debugObject = {};

//Stats
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const rgbeLoader = new RGBELoader();

/**
 * Environment map
 */
rgbeLoader.load("./hdri.hdr", (environmentMap) => {
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = environmentMap;
  scene.backgroundBlurriness = 0.5;
  scene.environment = environmentMap;
  console.log(environmentMap);
});

//Terrain
const geometry = new THREE.PlaneGeometry(10, 10, 500, 500);
geometry.deleteAttribute("uv"),
  geometry.deleteAttribute("normal"),
  geometry.rotateX(-Math.PI * 0.5);

//Material
debugObject.colorWaterDeep = "#5896f3";
debugObject.colorWaterSurface = "#0381a5";
debugObject.colorSand = "#a0d3fa";
debugObject.colorGrass = "#ace9fd";
debugObject.colorSnow = "#b9ccff";
debugObject.colorRock = "#7c7b95";

const uniforms = {
  uTime: new THREE.Uniform(0),

  uPositionFrequency: new THREE.Uniform(0.2),
  uStrength: new THREE.Uniform(3.5),
  uWarpFrequency: new THREE.Uniform(5.0),
  uWarpStrength: new THREE.Uniform(0.5),

  uColorWaterDeep: new THREE.Uniform(
    new THREE.Color(debugObject.colorWaterDeep)
  ),
  uColorWaterSurface: new THREE.Uniform(
    new THREE.Color(debugObject.colorWaterSurface)
  ),
  uColorSand: new THREE.Uniform(new THREE.Color(debugObject.colorSand)),
  uColorGrass: new THREE.Uniform(new THREE.Color(debugObject.colorGrass)),
  uColorSnow: new THREE.Uniform(new THREE.Color(debugObject.colorSnow)),
  uColorRock: new THREE.Uniform(new THREE.Color(debugObject.colorRock)),
};

//DEBUG GUI STUFFFF (get outta here if you value your sanity ; ik it looks ugly TwT)
gui
  .add(uniforms.uPositionFrequency, "value", 0, 1, 0.001)
  .name("uPositionFrequency");
gui.add(uniforms.uStrength, "value", 0, 10, 0.001).name("uStrength");
gui.add(uniforms.uWarpFrequency, "value", 0, 10, 0.001).name("uWarpFrequency");
gui.add(uniforms.uWarpStrength, "value", 0, 1, 0.001).name("uWarpStrength");

gui
  .addColor(debugObject, "colorWaterDeep")
  .onChange(() =>
    uniforms.uColorWaterDeep.value.set(debugObject.colorWaterDeep)
  );
gui
  .addColor(debugObject, "colorWaterSurface")
  .onChange(() =>
    uniforms.uColorWaterSurface.value.set(debugObject.colorWaterSurface)
  );
gui
  .addColor(debugObject, "colorSand")
  .onChange(() => uniforms.uColorSand.value.set(debugObject.colorSand));
gui
  .addColor(debugObject, "colorGrass")
  .onChange(() => uniforms.uColorGrass.value.set(debugObject.colorGrass));
gui
  .addColor(debugObject, "colorSnow")
  .onChange(() => uniforms.uColorSnow.value.set(debugObject.colorSnow));
gui
  .addColor(debugObject, "colorRock")
  .onChange(() => uniforms.uColorRock.value.set(debugObject.colorRock));

const material = new CustomShaderMaterial({
  //CSM
  baseMaterial: THREE.MeshStandardMaterial,
  vertexShader: terrainVertexShader,
  fragmentShader: terrainFragmentShader,
  uniforms: uniforms,
  //Mesh Standard Material
  metalness: 0,
  roughness: 0.5,
  color: "#85d534",
});
const depthMaterial = new CustomShaderMaterial({
  //CSM
  baseMaterial: THREE.MeshDepthMaterial,
  vertexShader: terrainVertexShader,
  uniforms: uniforms,
  //Mesh Depth Material
  depthPacking: THREE.RGBADepthPacking,
});

const terrain = new THREE.Mesh(geometry, material);
terrain.customDepthMaterial = depthMaterial;
terrain.castShadow = true;
terrain.receiveShadow = true;
scene.add(terrain);

//Water
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10, 1, 1),
  new THREE.MeshPhysicalMaterial({
    transmission: true,
    roughness: 0.3,
  })
);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.1;
scene.add(water);

// let waterVisibility = { visible: true };
// gui.add(waterVisibility, "visible").onChange(() => scene.remove(water));

//Board
//brushes need to be geometries
const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11));
const boardHole = new Brush(new THREE.BoxGeometry(10, 2.1, 10));

// boardHole.position.y = 0.2;
// boardHole.updateMatrixWorld();

//Cut the board using three-bvh-csg
const evaluator = new Evaluator();
const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION);

//Shadows
board.castShadow = true;
board.receiveShadow = true;

//Board Material
board.geometry.clearGroups();
board.material = new THREE.MeshStandardMaterial({
  color: "#fff",
  metalness: 0,
  roughness: 0.3,
});

scene.add(board);

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 2);
directionalLight.position.set(6.25, 3, 4);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.bottom = -8;
directionalLight.shadow.camera.left = -8;
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 7, 14);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  stats.begin();
  const elapsedTime = clock.getElapsedTime();
  uniforms.uTime.value = elapsedTime;

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
  stats.end();
};

tick();
