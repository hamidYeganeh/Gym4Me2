import type { Mesh, MeshStandardMaterial, Texture } from "three";
import type { PhoneMeasurements } from "./LandingDownload.types";

export async function createPhoneRenderer(host: HTMLDivElement) {
  const [three, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/environments/RoomEnvironment.js"),
  ]);

  const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = three.ACESFilmicToneMapping;
  renderer.outputColorSpace = three.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(32, 1, 0.1, 120);
  camera.position.set(0, 0, 28);
  scene.add(new three.AmbientLight(0xffffff, 0.55));
  const warm = new three.DirectionalLight("#fff5e6", 1.6);
  warm.position.set(3, 6, 5);
  scene.add(warm);
  const cool = new three.DirectionalLight("#cfe0ff", 0.6);
  cool.position.set(-4, 2, 3);
  scene.add(cool);
  const rim = new three.PointLight("#ffd8c0", 0.8);
  rim.position.set(0, 2, -6);
  scene.add(rim);

  const room = new RoomEnvironment();
  const pmrem = new three.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  let model;
  try {
    model = (await new GLTFLoader().loadAsync("/download/iphone.glb")).scene;
  } catch (error) {
    environment.dispose();
    renderer.dispose();
    throw error;
  }

  const bounds = new three.Box3().setFromObject(model);
  const size = bounds.getSize(new three.Vector3());
  const center = bounds.getCenter(new three.Vector3());
  const fit = 12.684 / Math.max(size.x, size.y, size.z);

  let screenMesh: Mesh | undefined;
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      const physical = material as MeshStandardMaterial;
      if (!physical.isMeshStandardMaterial) continue;
      const name = physical.name.toLowerCase();
      if (name.includes("screen_bg")) {
        physical.color.set("#020208");
        screenMesh = mesh;
      } else if (!/glass|flash|logo|camera_pixel|screen/.test(name)) {
        physical.color.set("#48484a");
        physical.metalness = 0.82;
        physical.roughness = 0.38;
        physical.envMapIntensity = 1.15;
      }
    }
  });

  const normalized = new three.Group();
  normalized.scale.setScalar(fit);
  normalized.position.copy(center).multiplyScalar(-fit);
  normalized.add(model);
  const pivot = new three.Group();
  pivot.add(normalized);
  scene.add(pivot);
  // Derive the DOM plane from the actual display mesh, including its offset.
  // The same camera and pivot project both the phone and its localized HTML UI.
  scene.updateMatrixWorld(true);
  if (!screenMesh) throw new Error("Phone display mesh is missing");
  const display = new three.Box3().setFromObject(screenMesh);
  const displaySize = display.getSize(new three.Vector3());
  const measurements: PhoneMeasurements = {
    width: (displaySize.x * 760) / 16.06,
    height: (displaySize.y * 760) / 16.06,
    radius: 30,
    front: (display.max.z * 760) / 16.06,
  };
  const displayPlane = new three.Matrix4()
    .makeTranslation(display.min.x, display.max.y, display.max.z + 0.006)
    .multiply(
      new three.Matrix4().makeScale(
        displaySize.x / 232,
        -displaySize.y / 503,
        1,
      ),
    );
  const viewport = new three.Matrix4();
  const projection = new three.Matrix4();
  host.appendChild(renderer.domElement);

  function resize() {
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const w = host.clientWidth / 2;
    const h = host.clientHeight / 2;
    viewport.set(w, 0, 0, w, 0, -h, 0, h, 0, 0, 1, 0, 0, 0, 0, 1);
  }
  resize();

  return {
    measurements,
    resize,
    render(angle: number) {
      pivot.rotation.y = (angle * Math.PI) / 180;
      renderer.render(scene, camera);
      projection
        .copy(viewport)
        .multiply(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse)
        .multiply(pivot.matrixWorld)
        .multiply(displayPlane);
      const elements = projection.elements;
      const divisor = elements[15]!;
      return `matrix3d(${elements.map((value) => value / divisor).join(",")})`;
    },
    dispose() {
      model.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          for (const value of Object.values(material)) {
            if ((value as Texture | undefined)?.isTexture)
              (value as Texture).dispose();
          }
          material.dispose();
        }
      });
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
