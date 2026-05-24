import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

const ThreeScene = () => {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const modelRef = useRef(null)
  const mixerRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())
  const animationFrameRef = useRef(null)

  // Rotation variables
  const targetRotationRef = useRef({ x: 0, y: 0 })
  const currentRotationRef = useRef({ x: 0, y: 0 })
  const sensitivity = Math.PI * 1.25

  useEffect(() => {
    if (!containerRef.current) {
      console.error('❌ ThreeScene: Container ref is null')
      return
    }

    console.log('✅ ThreeScene: Initializing 3D scene')
    
    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    camera.position.set(0, 1, 6)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0) // Transparent background
    // Use outputColorSpace instead of outputEncoding
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    renderer.domElement.style.position = 'fixed'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.pointerEvents = 'none'
    renderer.domElement.style.zIndex = '1'
    renderer.domElement.style.background = 'transparent'
    renderer.domElement.style.opacity = '0.6'
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement)
      console.log('✅ ThreeScene: Renderer canvas appended to container')
    } else {
      console.error('❌ ThreeScene: Container is null when trying to append canvas')
    }
    rendererRef.current = renderer

    // HDRI Environment
    new RGBELoader()
      .setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/')
      .load('studio_small_08_1k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        scene.environment = texture
        scene.environment.intensity = 0.8
      })

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(5, 10, 7)
    scene.add(dirLight)
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)
    
    const pointLight = new THREE.PointLight(0xc840e9, 1.5, 100)
    pointLight.position.set(0, 5, 5)
    scene.add(pointLight)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enableRotate = false
    controls.enableZoom = false
    controls.minDistance = camera.position.length()
    controls.maxDistance = camera.position.length()
    controlsRef.current = controls

    // GLTF Loader
    const loader = new GLTFLoader()
    // Try different paths - models should be in public/models
    const modelPath = '/models/cube/scene.gltf'
    
    console.log('Loading model from:', modelPath)

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene
        modelRef.current = model
        scene.add(model)

        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const originalColor = child.material.color?.clone() || new THREE.Color(0xc840e9)
            child.material = new THREE.MeshPhysicalMaterial({
              color: originalColor,
              metalness: 0.8,
              roughness: 0.1,
              clearcoat: 1.0,
              clearcoatRoughness: 0.1,
              envMapIntensity: 1.5,
              emissive: new THREE.Color(0xc840e9),
              emissiveIntensity: 2.0,
            })
            child.material.needsUpdate = true
          }
        })

        const box = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3()
        box.getSize(size)
        const center = new THREE.Vector3()
        box.getCenter(center)
        model.position.sub(center)

        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = window.innerWidth < 800 ? 1.7 / maxDim : 2.5 / maxDim
        model.scale.setScalar(scale)
        model.position.y += 0.2

        camera.position.set(0, 1, 6)
        controls.target.set(0, 0, 0)
        controls.update()

        if (gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(model)
          mixerRef.current = mixer
          const action = mixer.clipAction(gltf.animations[0])
          action.play()
        }

        console.log('✅ 3D Model loaded successfully')
        console.log('Model position:', model.position)
        console.log('Model scale:', model.scale)
        console.log('Camera position:', camera.position)
        
        // Force a render to ensure visibility
        renderer.render(scene, camera)
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percent = ((xhr.loaded / xhr.total) * 100).toFixed(0)
          console.log(`📦 Loading model: ${percent}%`)
        }
      },
      (err) => {
        console.error('❌ Error loading 3D model:', err)
        console.error('Model path attempted:', modelPath)
        console.error('Make sure the model files exist at: public/models/cube/scene.gltf')
        
        // Create a fallback visible object if model fails to load
        const geometry = new THREE.BoxGeometry(2, 2, 2)
        const material = new THREE.MeshPhysicalMaterial({
          color: 0xc840e9,
          emissive: 0xc840e9,
          emissiveIntensity: 2.0,
          metalness: 0.8,
          roughness: 0.1
        })
        const fallbackCube = new THREE.Mesh(geometry, material)
        scene.add(fallbackCube)
        console.log('✅ Added fallback cube')
      }
    )

    // Mouse move handler
    const handleMouseMove = (event) => {
      if (window.innerWidth >= 800) {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1
        const mouseY = (event.clientY / window.innerHeight) * 2 - 1
        targetRotationRef.current.y = mouseX * sensitivity
        targetRotationRef.current.x = mouseY * sensitivity
      }
    }

    // Scroll handler for mobile
    let lastScrollY = window.scrollY
    const handleScroll = () => {
      if (window.innerWidth < 800) {
        const deltaY = window.scrollY - lastScrollY
        targetRotationRef.current.y += deltaY * 0.01
        lastScrollY = window.scrollY
      }
    }

    // Touch handler
    const handleTouchMove = (event) => {
      if (window.innerWidth < 800 && event.touches.length === 1) {
        const deltaY = event.touches[0].clientY / window.innerHeight - 0.5
        targetRotationRef.current.y = deltaY * sensitivity
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('touchmove', handleTouchMove)

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()

      if (mixerRef.current) {
        mixerRef.current.update(delta)
      }

      if (modelRef.current) {
        currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08
        currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08
        modelRef.current.rotation.x = currentRotationRef.current.x
        modelRef.current.rotation.y = currentRotationRef.current.y
      }

      if (controlsRef.current) {
        controlsRef.current.update()
      }
      
      // Always render, even if model hasn't loaded yet
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()
    
    // Initial render to ensure canvas is visible
    renderer.render(scene, camera)

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('resize', handleResize)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
      }
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      id="container3D" 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    ></div>
  )
}

export default ThreeScene
