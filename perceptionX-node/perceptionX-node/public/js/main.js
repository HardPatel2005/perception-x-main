

// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.129.0/build/three.module.js';


// import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

// import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

// import { RGBELoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js";



// // Postprocessing

// import { EffectComposer } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/EffectComposer.js";

// import { RenderPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/RenderPass.js";

// import { UnrealBloomPass } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/UnrealBloomPass.js";



// const scene = new THREE.Scene();



// // Camera

// const camera = new THREE.PerspectiveCamera(

//   60,

//   window.innerWidth / window.innerHeight,

//   0.1,

//   2000

// );

// camera.position.set(0, 1, 6);



// // Renderer

// const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // ✅ alpha: true for transparency

// renderer.setSize(window.innerWidth, window.innerHeight);

// renderer.outputEncoding = THREE.sRGBEncoding;

// renderer.toneMapping = THREE.ACESFilmicToneMapping;

// renderer.toneMappingExposure = 1.5;

// document.getElementById("container3D").appendChild(renderer.domElement);

// renderer.setClearAlpha(0); // ✅ Sets the alpha to 0 (fully transparent)



// // Composer for postprocessing

// const composer = new EffectComposer(renderer);

// composer.addPass(new RenderPass(scene, camera));



// // Bloom effect

// const bloomPass = new UnrealBloomPass(

//   new THREE.Vector2(window.innerWidth, window.innerHeight),

//   1.2, // strength

//   0.6, // radius

//   0.0  // threshold

// );

// composer.addPass(bloomPass);



// // HDRI Environment

// new RGBELoader()

//   .setPath("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/")

//   .load("studio_small_08_1k.hdr", function (texture) {

//     texture.mapping = THREE.EquirectangularReflectionMapping;

//     // scene.environment = texture; // ❌ Remove this line to make the background transparent

//     scene.environment.intensity = 0.3; // 🔹 reduce reflection intensity globally

//   });



// // Lights

// const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);

// dirLight.position.set(5, 10, 7);

// scene.add(dirLight);



// // Controls

// const controls = new OrbitControls(camera, renderer.domElement);

// controls.enableDamping = true;

// controls.enableRotate = false; // disable manual orbit rotation

// controls.enableZoom = false;    // 🔹 disable zoom (scroll + pinch)

// controls.minDistance = camera.position.length();

// controls.maxDistance = camera.position.length();



// // GLTF Loader

// const loader = new GLTFLoader();

// let mixer;

// const clock = new THREE.Clock();

// let model;



// // rotation variables

// let targetRotationX = 0;

// let targetRotationY = 0;



// let currentRotationX = 0;

// let currentRotationY = 0;



// // sensitivity factor

// const sensitivity = Math.PI * 1.25; // ~135 degrees



// // ✅ Desktop: rotate with mouse move

// document.addEventListener("mousemove", (event) => {

//   if (window.innerWidth >= 800) {

//     const mouseX = (event.clientX / window.innerWidth) * 2 - 1;

//     const mouseY = (event.clientY / window.innerHeight) * 2 - 1;



//     targetRotationY = mouseX * sensitivity; // left-right

//     targetRotationX = mouseY * sensitivity; // up-down

//   }

// });



// // ✅ Mobile: rotate with scroll/swipe

// if (window.innerWidth < 800) {

//   let lastScrollY = window.scrollY;



//   window.addEventListener("scroll", () => {

//     const deltaY = window.scrollY - lastScrollY;



//     // rotate model based on scroll direction

//     targetRotationY += deltaY * 0.01; // adjust factor for speed

//     lastScrollY = window.scrollY;

//   });



//   // Also support touchmove (for smoother finger swipe)

//   window.addEventListener("touchmove", (event) => {

//     if (event.touches.length === 1) {

//       const deltaY = event.touches[0].clientY / window.innerHeight - 0.5;

//       targetRotationY = deltaY * sensitivity;

//     }

//   });

// }



// loader.load(

//   "./models/cube/scene.gltf",

//   (gltf) => {

//     model = gltf.scene;

//     scene.add(model);



//     model.traverse((child) => {

//       if (child.isMesh && child.material) {

//         // 🔹 Softer reflections

//         child.material.roughness = 0.8;    // more matte

//         child.material.metalness = 0.02;   // very low reflection

//         child.material.envMapIntensity = 0.3; // HDRI effect toned down

//         child.material.needsUpdate = true;

//       }

//     });



//     const box = new THREE.Box3().setFromObject(model);

//     const size = new THREE.Vector3();

//     box.getSize(size);

//     const center = new THREE.Vector3();

//     box.getCenter(center);



//     model.position.sub(center);



//     const maxDim = Math.max(size.x, size.y, size.z);

//     const scale = window.innerWidth < 800 ? 1.7 / maxDim : 2.5 / maxDim;

//     model.scale.setScalar(scale);



//     model.position.y += 0.2;



//     camera.position.set(0, 1, 6);

//     controls.target.set(0, 0, 0);

//     controls.update();



//     if (gltf.animations.length) {

//       mixer = new THREE.AnimationMixer(model);

//       const action = mixer.clipAction(gltf.animations[0]);

//       action.play();

//     }



//     console.log(`✅ Model loaded with scale ${scale.toFixed(2)}`);

//   },

//   (xhr) => console.log(`Loading: ${(xhr.loaded / xhr.total) * 100}%`),

//   (err) => console.error("Error loading model:", err)

// );



// // Animate

// function animate() {

//   requestAnimationFrame(animate);

//   const delta = clock.getDelta();



//   if (mixer) {

//     mixer.update(delta);

//   }



//   if (model) {

//     // smooth interpolation

//     currentRotationX += (targetRotationX - currentRotationX) * 0.08;

//     currentRotationY += (targetRotationY - currentRotationY) * 0.08;



//     model.rotation.x = currentRotationX;

//     model.rotation.y = currentRotationY;

//   }



//   controls.update();

//   renderer.render(scene, camera); // ❌ Use renderer.render() instead of composer.render()

// }

// animate();



// // Resize

// window.addEventListener("resize", () => {

//   camera.aspect = window.innerWidth / window.innerHeight;

//   camera.updateProjectionMatrix();

//   renderer.setSize(window.innerWidth, window.innerHeight);

//   // ❌ composer.setSize(window.innerWidth, window.innerHeight); // Remove composer sizing

// });



// --------------------------------------------------
the 

// ------------------------------------------------------------
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.129.0/build/three.module.js';
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js";

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 1, 6);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // Transparent background
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

const container3D = document.getElementById("container3D");
if (container3D) {
    container3D.appendChild(renderer.domElement);
} else {
    console.error("container3D element not found!");
}

// HDRI Environment
new RGBELoader()
  .setPath("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/")
  .load("studio_small_08_1k.hdr", function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.environment.intensity = 0.8; // Increased reflection intensity for a more modern look
  });

// Lights
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = false;
controls.enableZoom = false;
controls.minDistance = camera.position.length();
controls.maxDistance = camera.position.length();

// GLTF Loader
const loader = new GLTFLoader();
loader.setPath('/models/cube/'); // Set base path for model
let mixer;
const clock = new THREE.Clock();
let model;

// rotation variables
let targetRotationX = 0;
let targetRotationY = 0;
let currentRotationX = 0;
let currentRotationY = 0;
const sensitivity = Math.PI * 1.25;

// Mouse/touch event listeners
document.addEventListener("mousemove", (event) => {
  if (window.innerWidth >= 800) {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    targetRotationY = mouseX * sensitivity;
    targetRotationX = mouseY * sensitivity;
  }
});

if (window.innerWidth < 800) {
  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    const deltaY = window.scrollY - lastScrollY;
    targetRotationY += deltaY * 0.01;
    lastScrollY = window.scrollY;
  });
  window.addEventListener("touchmove", (event) => {
    if (event.touches.length === 1) {
      const deltaY = event.touches[0].clientY / window.innerHeight - 0.5;
      targetRotationY = deltaY * sensitivity;
    }
  });
}

loader.load(
  "scene.gltf",
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Change to MeshPhysicalMaterial for better control
        const originalColor = child.material.color.clone();
        child.material = new THREE.MeshPhysicalMaterial({
          color: originalColor,
          metalness: 0.8, // Increased metalness for a more reflective, futuristic look
          roughness: 0.1, // Decreased roughness for sharp reflections
          clearcoat: 1.0, // Add a clearcoat for a glossy finish
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.0, // High reflection intensity
          // Emissive color for a built-in glow effect
          emissive: originalColor,
          emissiveIntensity: 1.5, // Increased emissive intensity
        });
        child.material.needsUpdate = true;
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = window.innerWidth < 800 ? 1.7 / maxDim : 2.5 / maxDim;
    model.scale.setScalar(scale);
    model.position.y += 0.2;
    camera.position.set(0, 1, 6);
    controls.target.set(0, 0, 0);
    controls.update();

    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  },
  (xhr) => console.log(`Loading: ${(xhr.loaded / xhr.total) * 100}%`),
  (err) => console.error("Error loading model:", err)
);

// Animate
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  if (model) {
    currentRotationX += (targetRotationX - currentRotationX) * 0.08;
    currentRotationY += (targetRotationY - currentRotationY) * 0.08;
    model.rotation.x = currentRotationX;
    model.rotation.y = currentRotationY;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});