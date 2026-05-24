import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const Home3D = () => {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const modelRef = useRef(null)
  const mixerRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())
  const animationFrameRef = useRef(null)

  // AI/Detection elements refs
  const boundingBoxRef = useRef(null)
  const cornerMarkersRef = useRef([])
  const scanningLinesRef = useRef([])
  const gridOverlayRef = useRef(null)
  const glowEffectRef = useRef(null)
  const particlesRef = useRef(null)
  const scanProgressRef = useRef(0)

  // Rotation variables for auto-rotation and mouse interaction
  const targetRotationRef = useRef({ x: 0, y: 0 })
  const currentRotationRef = useRef({ x: 0, y: 0 })
  const sensitivity = Math.PI * 0.5

  useEffect(() => {
    if (!containerRef.current) return

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight || 384 // Default to h-96 (384px)
    
    const camera = new THREE.PerspectiveCamera(
      40, // Slightly narrower FOV to fit better
      width / height,
      0.1,
      100
    )
    camera.position.set(0, 0, 7.5) // Further back to fit all elements
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0) // Transparent background
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 2.0
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement)
    }
    rendererRef.current = renderer

    // Enhanced lighting setup for maximum visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
    scene.add(ambientLight)
    
    // Main directional light from top-right - stronger
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0)
    dirLight1.position.set(5, 8, 5)
    dirLight1.castShadow = true
    dirLight1.shadow.mapSize.width = 2048
    dirLight1.shadow.mapSize.height = 2048
    scene.add(dirLight1)

    // Secondary directional light from opposite side for fill
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight2.position.set(-4, 3, -4)
    scene.add(dirLight2)

    // Third directional light from front
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight3.position.set(0, 2, 6)
    scene.add(dirLight3)

    // Point light for highlights
    const pointLight1 = new THREE.PointLight(0xffffff, 1.5, 15)
    pointLight1.position.set(3, 4, 5)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffffff, 1.0, 12)
    pointLight2.position.set(-3, -2, 4)
    scene.add(pointLight2)

    // Hemisphere light for natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x666666, 0.8)
    hemiLight.position.set(0, 5, 0)
    scene.add(hemiLight)

    // GLTF Loader
    const loader = new GLTFLoader()
    const modelPath = '/models/cube/scene.gltf'

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene
        modelRef.current = model
        scene.add(model)

        // Enhanced material with coral/red color to match image
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            // Main material with coral/red color
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0xff6b6b, // Coral/light red color
              metalness: 0.3,
              roughness: 0.4,
              clearcoat: 0.5,
              clearcoatRoughness: 0.2,
              side: THREE.DoubleSide,
            })
            child.material.needsUpdate = true
            child.castShadow = true
            child.receiveShadow = true

            // Add black edges/wireframe for segmented Rubik's Cube look
            const edgesGeometry = new THREE.EdgesGeometry(child.geometry)
            const edgesMaterial = new THREE.LineBasicMaterial({
              color: 0x000000, // Black outlines
              linewidth: 2
            })
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
            child.add(edges)
          }
        })

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3()
        box.getSize(size)
        const center = new THREE.Vector3()
        box.getCenter(center)
        model.position.sub(center)

        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2.5 / maxDim // Slightly reduced scale to fit canvas
        model.scale.setScalar(scale)

        // Ensure model is centered and visible
        model.position.set(0, 0, 0)
        camera.position.set(0, 0, 7.5) // Further back to accommodate all elements
        camera.lookAt(0, 0, 0)

        // ============================================
        // AI/Detection Visual Enhancements
        // ============================================

        // 1. Create Bounding Box (Red wireframe) - reduced size to fit canvas
        const boundingBoxSize = Math.max(size.x, size.y, size.z) * scale * 1.1
        const boundingBoxGeometry = new THREE.BoxGeometry(
          boundingBoxSize,
          boundingBoxSize,
          boundingBoxSize
        )
        const boundingBoxEdges = new THREE.EdgesGeometry(boundingBoxGeometry)
        const boundingBoxMaterial = new THREE.LineBasicMaterial({
          color: 0xff0000, // Red
          linewidth: 2,
          transparent: true,
          opacity: 0.8
        })
        const boundingBox = new THREE.LineSegments(boundingBoxEdges, boundingBoxMaterial)
        boundingBox.position.copy(model.position)
        scene.add(boundingBox)
        boundingBoxRef.current = boundingBox

        // 2. Create Corner Markers (8 pulsing red circles)
        const cornerMarkerGeometry = new THREE.SphereGeometry(0.08, 16, 16)
        const cornerMarkerMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.9
        })
        
        const corners = [
          [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]
        ]
        
        corners.forEach((corner, index) => {
          const marker = new THREE.Mesh(cornerMarkerGeometry, cornerMarkerMaterial.clone())
          marker.position.set(
            corner[0] * boundingBoxSize * 0.5,
            corner[1] * boundingBoxSize * 0.5,
            corner[2] * boundingBoxSize * 0.5
          )
          scene.add(marker)
          cornerMarkersRef.current.push(marker)
        })

        // 3. Create Detection Grid Overlay - reduced size
        const gridHelper = new THREE.GridHelper(boundingBoxSize * 1.2, 12, 0xff0000, 0xff0000)
        gridHelper.material.opacity = 0.15
        gridHelper.material.transparent = true
        gridHelper.position.copy(model.position)
        scene.add(gridHelper)
        gridOverlayRef.current = gridHelper

        // 4. Create Scanning Lines (Vertical lines moving across)
        const scanningLineGroup = new THREE.Group()
        for (let i = 0; i < 3; i++) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-boundingBoxSize * 0.6, -boundingBoxSize * 0.6, 0),
            new THREE.Vector3(-boundingBoxSize * 0.6, boundingBoxSize * 0.6, 0)
          ])
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.4,
            linewidth: 1
          })
          const line = new THREE.Line(lineGeometry, lineMaterial)
          line.position.x = (i - 1) * boundingBoxSize * 0.4
          scanningLineGroup.add(line)
          scanningLinesRef.current.push(line)
        }
        scanningLineGroup.position.copy(model.position)
        scene.add(scanningLineGroup)

        // 5. Create Glow/Halo Effect - reduced size
        const glowGeometry = new THREE.BoxGeometry(
          boundingBoxSize * 1.05,
          boundingBoxSize * 1.05,
          boundingBoxSize * 1.05
        )
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide
        })
        const glow = new THREE.Mesh(glowGeometry, glowMaterial)
        glow.position.copy(model.position)
        scene.add(glow)
        glowEffectRef.current = glow

        // 6. Create Particle System - reduced radius to fit canvas
        const particleCount = 40
        const particlesGeometry = new THREE.BufferGeometry()
        const positions = new Float32Array(particleCount * 3)
        
        for (let i = 0; i < particleCount * 3; i += 3) {
          const radius = boundingBoxSize * 0.7 + Math.random() * boundingBoxSize * 0.3
          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI
          
          positions[i] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[i + 2] = radius * Math.cos(phi)
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const particlesMaterial = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.05,
          transparent: true,
          opacity: 0.6
        })
        const particles = new THREE.Points(particlesGeometry, particlesMaterial)
        particles.position.copy(model.position)
        scene.add(particles)
        particlesRef.current = particles

        // 7. Create Dimension Labels (using HTML overlays - will be handled in render)
        
        // Force initial render multiple times to ensure visibility
        renderer.render(scene, camera)
        setTimeout(() => renderer.render(scene, camera), 100)
        setTimeout(() => renderer.render(scene, camera), 300)

        if (gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(model)
          mixerRef.current = mixer
          const action = mixer.clipAction(gltf.animations[0])
          action.play()
        }
      },
      undefined,
      (err) => {
        console.error('Error loading 3D model for home page:', err)
        // Fallback: create a better looking geometric shape with coral/red color
        const fallbackSize = 2.5
        const geometry = new THREE.BoxGeometry(fallbackSize, fallbackSize, fallbackSize)
        const material = new THREE.MeshPhysicalMaterial({
          color: 0xff6b6b, // Coral/light red color to match image
          metalness: 0.3,
          roughness: 0.4,
          clearcoat: 0.5,
          clearcoatRoughness: 0.2,
        })
        const fallbackCube = new THREE.Mesh(geometry, material)
        fallbackCube.castShadow = true
        fallbackCube.receiveShadow = true
        fallbackCube.position.set(0, 0, 0)
        
        // Add black edges for segmented Rubik's Cube look
        const edgesGeometry = new THREE.EdgesGeometry(geometry)
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: 0x000000, // Black outlines
          linewidth: 2
        })
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
        fallbackCube.add(edges)
        
        scene.add(fallbackCube)
        modelRef.current = fallbackCube

        // Add same AI enhancements to fallback cube - reduced size
        const boundingBoxSize = fallbackSize * 1.1
        const boundingBoxGeometry = new THREE.BoxGeometry(boundingBoxSize, boundingBoxSize, boundingBoxSize)
        const boundingBoxEdges = new THREE.EdgesGeometry(boundingBoxGeometry)
        const boundingBoxMaterial = new THREE.LineBasicMaterial({
          color: 0xff0000,
          linewidth: 2,
          transparent: true,
          opacity: 0.8
        })
        const boundingBox = new THREE.LineSegments(boundingBoxEdges, boundingBoxMaterial)
        boundingBox.position.set(0, 0, 0)
        scene.add(boundingBox)
        boundingBoxRef.current = boundingBox

        // Corner markers
        const cornerMarkerGeometry = new THREE.SphereGeometry(0.08, 16, 16)
        const cornerMarkerMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.9
        })
        
        const corners = [
          [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]
        ]
        
        corners.forEach((corner) => {
          const marker = new THREE.Mesh(cornerMarkerGeometry, cornerMarkerMaterial.clone())
          marker.position.set(
            corner[0] * boundingBoxSize * 0.5,
            corner[1] * boundingBoxSize * 0.5,
            corner[2] * boundingBoxSize * 0.5
          )
          scene.add(marker)
          cornerMarkersRef.current.push(marker)
        })

        // Grid overlay - reduced size
        const gridHelper = new THREE.GridHelper(boundingBoxSize * 1.2, 12, 0xff0000, 0xff0000)
        gridHelper.material.opacity = 0.15
        gridHelper.material.transparent = true
        gridHelper.position.set(0, 0, 0)
        scene.add(gridHelper)
        gridOverlayRef.current = gridHelper

        // Scanning lines
        const scanningLineGroup = new THREE.Group()
        for (let i = 0; i < 3; i++) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-boundingBoxSize * 0.6, -boundingBoxSize * 0.6, 0),
            new THREE.Vector3(-boundingBoxSize * 0.6, boundingBoxSize * 0.6, 0)
          ])
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.4,
            linewidth: 1
          })
          const line = new THREE.Line(lineGeometry, lineMaterial)
          line.position.x = (i - 1) * boundingBoxSize * 0.4
          scanningLineGroup.add(line)
          scanningLinesRef.current.push(line)
        }
        scanningLineGroup.position.set(0, 0, 0)
        scene.add(scanningLineGroup)

        // Glow effect - reduced size
        const glowGeometry = new THREE.BoxGeometry(
          boundingBoxSize * 1.05,
          boundingBoxSize * 1.05,
          boundingBoxSize * 1.05
        )
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide
        })
        const glow = new THREE.Mesh(glowGeometry, glowMaterial)
        glow.position.set(0, 0, 0)
        scene.add(glow)
        glowEffectRef.current = glow

        // Particles - reduced radius
        const particleCount = 40
        const particlesGeometry = new THREE.BufferGeometry()
        const positions = new Float32Array(particleCount * 3)
        
        for (let i = 0; i < particleCount * 3; i += 3) {
          const radius = boundingBoxSize * 0.7 + Math.random() * boundingBoxSize * 0.3
          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI
          
          positions[i] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[i + 2] = radius * Math.cos(phi)
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const particlesMaterial = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.05,
          transparent: true,
          opacity: 0.6
        })
        const particles = new THREE.Points(particlesGeometry, particlesMaterial)
        particles.position.set(0, 0, 0)
        scene.add(particles)
        particlesRef.current = particles
        
        // Force initial render
        renderer.render(scene, camera)
      }
    )

    // Mouse move handler for interactive rotation - works on whole page
    const handleMouseMove = (event) => {
      // Use window dimensions for full-page interaction
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1
      const mouseY = (event.clientY / window.innerHeight) * 2 - 1
      
      targetRotationRef.current.y = mouseX * sensitivity
      targetRotationRef.current.x = -mouseY * sensitivity
    }

    // Mouse leave handler - return to auto-rotation when mouse leaves window
    const handleMouseLeave = () => {
      targetRotationRef.current.x = 0
      targetRotationRef.current.y = 0
    }

    // Attach to window for whole-page interaction
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    // Auto-rotation animation with AI effects
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      const elapsedTime = clockRef.current.getElapsedTime()

      if (mixerRef.current) {
        mixerRef.current.update(delta)
      }

      // Smooth interpolation for rotation
      if (modelRef.current) {
        currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.05
        currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.05
        
        // Add slow auto-rotation when not interacting
        if (Math.abs(targetRotationRef.current.x) < 0.01 && Math.abs(targetRotationRef.current.y) < 0.01) {
          currentRotationRef.current.y += delta * 0.3
        }
        
        modelRef.current.rotation.x = currentRotationRef.current.x
        modelRef.current.rotation.y = currentRotationRef.current.y
      }

      // Animate bounding box rotation to match model
      if (boundingBoxRef.current) {
        boundingBoxRef.current.rotation.copy(modelRef.current?.rotation || new THREE.Euler())
      }

      // Animate corner markers (pulsing effect)
      cornerMarkersRef.current.forEach((marker, index) => {
        if (marker) {
          const pulse = Math.sin(elapsedTime * 2 + index * 0.5) * 0.3 + 0.7
          marker.material.opacity = pulse
          marker.scale.setScalar(0.8 + pulse * 0.4)
          marker.rotation.copy(modelRef.current?.rotation || new THREE.Euler())
        }
      })

      // Animate scanning lines (moving across)
      scanProgressRef.current = (scanProgressRef.current + delta * 0.5) % (Math.PI * 2)
      scanningLinesRef.current.forEach((line, index) => {
        if (line) {
          const offset = scanProgressRef.current + index * 0.5
          line.position.x = Math.sin(offset) * 1.5
          line.material.opacity = 0.2 + Math.sin(offset) * 0.3
          line.rotation.copy(modelRef.current?.rotation || new THREE.Euler())
        }
      })

      // Animate grid overlay
      if (gridOverlayRef.current) {
        gridOverlayRef.current.rotation.copy(modelRef.current?.rotation || new THREE.Euler())
      }

      // Animate glow effect
      if (glowEffectRef.current) {
        glowEffectRef.current.rotation.copy(modelRef.current?.rotation || new THREE.Euler())
        const glowPulse = Math.sin(elapsedTime * 1.5) * 0.05 + 0.1
        glowEffectRef.current.material.opacity = glowPulse
      }

      // Animate particles (orbital motion)
      if (particlesRef.current) {
        particlesRef.current.rotation.y += delta * 0.2
        particlesRef.current.rotation.x += delta * 0.1
        const positions = particlesRef.current.geometry.attributes.position.array
        for (let i = 0; i < positions.length; i += 3) {
          const radius = Math.sqrt(positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2)
          const theta = Math.atan2(positions[i + 1], positions[i]) + delta * 0.1
          const phi = Math.acos(positions[i + 2] / radius) + delta * 0.05
          
          positions[i] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[i + 2] = radius * Math.cos(phi)
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && rendererRef.current && cameraRef.current) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight || 384
        
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
    }
    
    // Initial resize
    handleResize()
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
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
      className="w-full h-full min-h-[400px] lg:min-h-[500px] overflow-hidden flex items-center justify-center relative"
      style={{ 
        background: 'transparent',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }}
    >
      {/* HTML Overlays for Detection Labels */}
      <div 
        className="absolute inset-0 pointer-events-none z-20"
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Object Detected Label */}
        <div
          className="absolute"
          style={{
            top: '15%',
            right: '15%',
            background: 'rgba(200, 200, 200, 0.9)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          Object Detected
        </div>

        {/* Confidence Label */}
        <div
          className="absolute"
          style={{
            bottom: '25%',
            left: '15%',
            background: 'rgba(255, 107, 107, 0.9)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(255,0,0,0.2)'
          }}
        >
          99.8% Confidence
        </div>

        {/* Real-time Processing Label */}
        <div
          className="absolute"
          style={{
            bottom: '10%',
            right: '15%',
            background: 'rgba(200, 200, 200, 0.9)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#333',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          Real-time Processing
        </div>
      </div>
    </div>
  )
}

export default Home3D
