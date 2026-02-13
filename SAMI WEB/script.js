import * as THREE from 'three';


/* ========================================
   EDIFICIO 3D FLUIDO - ROTACIÓN CONTINUA
   ======================================== */


class EdificioIT {
    constructor() {
        this.canvas = document.getElementById('edificio3d');
        if (!this.canvas) {
            console.error('Canvas no encontrado');
            return;
        }


        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });


        // Grupos y objetos
        this.edificioGroup = new THREE.Group();
        this.plantas = [];
        this.accentLights = [];


        // Control estado - MÁS SUAVE
        this.currentScroll = 0;
        this.targetScroll = 0;
        this.scrollProgress = 0;
        this.targetScrollProgress = 0;


        // Control ratón
        this.isDragging = false;
        this.previousMouse = { x: 0, y: 0 };
        this.manualRotation = 0;
        this.targetManualRotation = 0;


        // Nombres plantas
        this.plantasInfo = [
            { num: 1, name: 'Financiación', color: 0x10b981 },
            { num: 2, name: 'Rentabilidad', color: 0x3b82f6 },
            { num: 3, name: 'Fiscalidad', color: 0xf59e0b },
            { num: 4, name: 'Trámites', color: 0xef4444 },
            { num: 5, name: '¡Listo!', color: 0x8b5cf6 }
        ];


        this.init();
    }


    init() {
        // Renderer config
        const wrapper = document.querySelector('.edificio-wrapper');
        const width = wrapper.offsetWidth;
        const height = wrapper.offsetHeight;


        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;


        // Camera inicial - VER TODO EL EDIFICIO
        this.camera.position.set(0, 18, 60);
        this.camera.lookAt(0, 18, 0);
        
        // FOV amplio
        this.camera.fov = 52;
        this.camera.updateProjectionMatrix();


        // Fog suave
        this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.005);


        // Crear escena
        this.setupLights();
        this.createEdificio();
        this.setupControls();
        this.setupScroll();


        // Resize
        window.addEventListener('resize', () => this.onResize());


        // Iniciar animación
        this.animate();
    }


    setupLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);


        // Main light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(25, 45, 25);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 150;
        mainLight.shadow.camera.left = -50;
        mainLight.shadow.camera.right = 50;
        mainLight.shadow.camera.top = 60;
        mainLight.shadow.camera.bottom = -15;
        this.scene.add(mainLight);


        // Fill light
        const fillLight = new THREE.DirectionalLight(0x60a5fa, 1);
        fillLight.position.set(-20, 20, -15);
        this.scene.add(fillLight);


        // Rim light
        const rimLight = new THREE.PointLight(0x2563eb, 3, 90);
        rimLight.position.set(0, 35, -30);
        this.scene.add(rimLight);


        // Accent lights por planta
        for (let i = 0; i < 5; i++) {
            const light = new THREE.PointLight(0x2563eb, 0, 25);
            light.position.set(0, 5 + i * 7, 12);
            this.scene.add(light);
            this.accentLights.push(light);
        }


        // Luz base
        const baseLight = new THREE.PointLight(0x2563eb, 2, 30);
        baseLight.position.set(0, -5, 0);
        this.scene.add(baseLight);
    }


    createEdificio() {
        // BASE COMPLETA
        const baseGeo = new THREE.CylinderGeometry(12, 13.5, 3.5, 64);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a3e,
            metalness: 0.8,
            roughness: 0.2
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -2.5;
        base.receiveShadow = true;
        base.castShadow = true;
        this.edificioGroup.add(base);


        // Plataforma negra
        const platformGeo = new THREE.CylinderGeometry(14, 14.5, 0.5, 64);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a1a,
            metalness: 0.9,
            roughness: 0.1
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = -4.5;
        platform.receiveShadow = true;
        this.edificioGroup.add(platform);


        // Anillos base
        for (let i = 0; i < 5; i++) {
            const ringGeo = new THREE.TorusGeometry(12 - i * 0.7, 0.15, 16, 100);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0x2563eb,
                emissive: 0x2563eb,
                emissiveIntensity: 1.5,
                metalness: 1,
                roughness: 0
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = -1 + i * 0.6;
            this.edificioGroup.add(ring);
        }


        // PLANTAS (5 plantas)
        const colores = [
            { color: 0x10b981, emissive: 0x059669 },
            { color: 0x3b82f6, emissive: 0x1d4ed8 },
            { color: 0xf59e0b, emissive: 0xd97706 },
            { color: 0xef4444, emissive: 0xdc2626 },
            { color: 0x8b5cf6, emissive: 0x7c3aed }
        ];


        for (let i = 0; i < 5; i++) {
            const altura = 3 + (i * 7);
            const planta = this.createPlanta(i, altura, colores[i]);
            this.plantas.push(planta);
            this.edificioGroup.add(planta);
        }


        // TECHO
        const techoGeo = new THREE.ConeGeometry(5.5, 5, 8);
        const techoMat = new THREE.MeshPhysicalMaterial({
            color: 0x3b82f6,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.85
        });
        const techo = new THREE.Mesh(techoGeo, techoMat);
        techo.position.y = 40;
        techo.rotation.y = Math.PI / 8;
        techo.castShadow = true;
        this.edificioGroup.add(techo);


        // ANTENA
        const antenaGeo = new THREE.CylinderGeometry(0.15, 0.15, 7, 16);
        const antenaMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x2563eb,
            emissiveIntensity: 1.8,
            metalness: 1,
            roughness: 0
        });
        const antena = new THREE.Mesh(antenaGeo, antenaMat);
        antena.position.y = 46;
        this.edificioGroup.add(antena);


        // Esferas antena
        for (let i = 0; i < 5; i++) {
            const esferaGeo = new THREE.SphereGeometry(0.35, 32, 32);
            const esferaMat = new THREE.MeshStandardMaterial({
                color: 0x60a5fa,
                emissive: 0x2563eb,
                emissiveIntensity: 2.5,
                metalness: 1,
                roughness: 0
            });
            const esfera = new THREE.Mesh(esferaGeo, esferaMat);
            esfera.position.y = 43 + i * 1.3;
            esfera.userData.pulseOffset = i;
            this.edificioGroup.add(esfera);
        }


        this.edificioGroup.position.y = 0;
        this.scene.add(this.edificioGroup);
    }


    createPlanta(index, altura, colores) {
        const grupo = new THREE.Group();
        const ancho = 10 - index * 0.9;


        // Cuerpo principal
        const cuerpoGeo = new THREE.BoxGeometry(ancho, 6, ancho);
        const cuerpoMat = new THREE.MeshPhysicalMaterial({
            color: 0x1e293b,
            metalness: 0.5,
            roughness: 0.1,
            transparent: true,
            opacity: 0.7
        });
        const cuerpo = new THREE.Mesh(cuerpoGeo, cuerpoMat);
        cuerpo.position.y = 3;
        cuerpo.castShadow = true;
        cuerpo.receiveShadow = true;
        grupo.add(cuerpo);


        // Bordes neón
        const edgesGeo = new THREE.EdgesGeometry(cuerpoGeo);
        const edgesMat = new THREE.LineBasicMaterial({
            color: colores.color,
            linewidth: 2
        });
        const edges = new THREE.LineSegments(edgesGeo, edgesMat);
        cuerpo.add(edges);


        // Ventanas 5x5
        const ventanas = [];
        const caras = [
            { x: 0, z: ancho/2 + 0.02, rotY: 0 },
            { x: ancho/2 + 0.02, z: 0, rotY: Math.PI/2 },
            { x: 0, z: -ancho/2 - 0.02, rotY: Math.PI },
            { x: -ancho/2 - 0.02, z: 0, rotY: -Math.PI/2 }
        ];


        caras.forEach(cara => {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const ventanaGeo = new THREE.PlaneGeometry(0.65, 0.85);
                    const ventanaMat = new THREE.MeshStandardMaterial({
                        color: colores.color,
                        emissive: colores.emissive,
                        emissiveIntensity: 0.8,
                        side: THREE.DoubleSide
                    });
                    const ventana = new THREE.Mesh(ventanaGeo, ventanaMat);


                    const spacing = (ancho - 1.5) / 5;
                    ventana.position.set(
                        cara.x + (col - 2) * spacing,
                        0.5 + (row - 2) * 1.1,
                        cara.z
                    );
                    ventana.rotation.y = cara.rotY;
                    grupo.add(ventana);
                    ventanas.push(ventana);
                }
            }
        });


        // Banda superior
        const bandaGeo = new THREE.BoxGeometry(ancho + 0.6, 0.7, ancho + 0.6);
        const bandaMat = new THREE.MeshStandardMaterial({
            color: colores.color,
            emissive: colores.emissive,
            emissiveIntensity: 0.8,
            metalness: 0.9,
            roughness: 0.1
        });
        const banda = new THREE.Mesh(bandaGeo, bandaMat);
        banda.position.y = 6.35;
        banda.castShadow = true;
        grupo.add(banda);


        // Columnas
        const columnas = [
            [ancho/2 - 0.35, ancho/2 - 0.35],
            [-ancho/2 + 0.35, ancho/2 - 0.35],
            [ancho/2 - 0.35, -ancho/2 + 0.35],
            [-ancho/2 + 0.35, -ancho/2 + 0.35]
        ];


        columnas.forEach(pos => {
            const columnaGeo = new THREE.BoxGeometry(0.5, 6, 0.5);
            const columnaMat = new THREE.MeshStandardMaterial({
                color: colores.color,
                emissive: colores.emissive,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2
            });
            const columna = new THREE.Mesh(columnaGeo, columnaMat);
            columna.position.set(pos[0], 3, pos[1]);
            columna.castShadow = true;
            grupo.add(columna);
        });


        grupo.position.y = altura;
        grupo.userData = {
            index: index + 1,
            ventanas: ventanas,
            color: colores,
            altura: altura
        };


        return grupo;
    }


    setupControls() {
        // Mouse drag
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMouse = { x: e.clientX, y: e.clientY };
        });


        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMouse.x;
                this.targetManualRotation += deltaX * 0.01;
                this.previousMouse = { x: e.clientX, y: e.clientY };
            }
        });


        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });


        // Touch
        this.canvas.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.previousMouse = { 
                x: e.touches[0].clientX, 
                y: e.touches[0].clientY 
            };
        });


        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                const deltaX = e.touches[0].clientX - this.previousMouse.x;
                this.targetManualRotation += deltaX * 0.01;
                this.previousMouse = { 
                    x: e.touches[0].clientX, 
                    y: e.touches[0].clientY 
                };
            }
        });


        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }


    setupScroll() {
        let ticking = false;


        const updateScroll = () => {
            const heroHeight = document.querySelector('.hero-section').offsetHeight;
            const scrollTop = window.scrollY;
            const scrollContainer = document.querySelector('.scroll-container');
            const totalHeight = scrollContainer.offsetHeight;
            const finalSection = document.querySelector('.planta.final');
            const finalRect = finalSection.getBoundingClientRect();


            // Visibilidad edificio
            const wrapper = document.querySelector('.edificio-wrapper');
            const navDots = document.querySelector('.nav-dots');


            if (scrollTop < heroHeight * 0.7) {
                wrapper.classList.remove('visible');
                navDots.classList.remove('visible');
            } else if (finalRect.top < window.innerHeight * 0.6) {
                wrapper.classList.remove('visible');
                navDots.classList.remove('visible');
            } else {
                wrapper.classList.add('visible');
                navDots.classList.add('visible');
            }


            // Calcular progreso CONTINUO
            const scrollInPlantas = Math.max(0, scrollTop - heroHeight);
            this.targetScrollProgress = Math.min(scrollInPlantas / (totalHeight - window.innerHeight), 1);


            // Planta actual para UI (1-5)
            const plantaFloat = this.targetScrollProgress * 5;
            const currentPlanta = Math.min(Math.max(Math.floor(plantaFloat) + 1, 1), 5);


            this.updateUI(currentPlanta);
            this.updateContentVisibility();
            
            // ✅ DETECTAR PLANTA ACTIVA PARA OVERLAY
            this.updateActivePlanta();


            ticking = false;
        };


        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateScroll);
                ticking = true;
            }
        }, { passive: true });


        // Click en dots
        document.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const plantaNum = parseInt(dot.getAttribute('data-planta'));
                const sections = document.querySelectorAll('.planta');
                if (sections[plantaNum - 1]) {
                    sections[plantaNum - 1].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            });
        });


        updateScroll();
    }


    updateUI(currentPlanta) {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${this.targetScrollProgress * 100}%`;
        }


        const plantaNum = document.querySelector('.planta-num');
        const plantaName = document.querySelector('.planta-name');
        const plantaIndicator = document.querySelector('.planta-indicator');


        if (plantaNum && plantaName && plantaIndicator) {
            const info = this.plantasInfo[currentPlanta - 1];
            if (info) {
                plantaNum.textContent = info.num;
                plantaName.textContent = info.name;
                
                const colorHex = `#${info.color.toString(16).padStart(6, '0')}`;
                plantaIndicator.style.background = `linear-gradient(135deg, ${colorHex}, rgba(59, 130, 246, 0.95))`;
            }
        }


        document.querySelectorAll('.dot').forEach((dot, index) => {
            if (index + 1 === currentPlanta) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }


    updateContentVisibility() {
        document.querySelectorAll('.planta').forEach((section) => {
            const rect = section.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3;


            const contentLeft = section.querySelector('.content-left');
            const contentRight = section.querySelector('.content-right');


            if (isVisible) {
                if (contentLeft) contentLeft.classList.add('active');
                if (contentRight) contentRight.classList.add('active');
            } else {
                if (contentLeft) contentLeft.classList.remove('active');
                if (contentRight) contentRight.classList.remove('active');
            }
        });
    }


    // ✅ NUEVO MÉTODO - Detectar planta centrada para mostrar overlay
    updateActivePlanta() {
        document.querySelectorAll('.planta').forEach((section) => {
            const rect = section.getBoundingClientRect();
            const windowCenter = window.innerHeight / 2;
            
            // Detectar si la planta está centrada en la pantalla
            const isCenter = rect.top < windowCenter && rect.bottom > windowCenter;
            
            if (isCenter) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }


    animate() {
        requestAnimationFrame(() => this.animate());


        // Interpolación ULTRA SUAVE
        const lerp = (a, b, t) => a + (b - a) * t;


        this.scrollProgress = lerp(this.scrollProgress, this.targetScrollProgress, 0.04);
        this.manualRotation = lerp(this.manualRotation, this.targetManualRotation, 0.08);


        // ROTACIÓN FLUIDA CONTINUA
        const scrollRotation = this.scrollProgress * Math.PI * 2;
        this.edificioGroup.rotation.y = scrollRotation + this.manualRotation;


        // Bamboleo muy sutil
        this.edificioGroup.rotation.x = Math.sin(this.scrollProgress * Math.PI * 2) * 0.02;


        // ZOOM Y CÁMARA FLUIDOS - BAJADA CONTINUA
        const baseHeight = 3;  // Altura base (cerca de plataforma)
        const maxHeight = 36;  // Altura máxima (cerca antena)
        const heightRange = maxHeight - baseHeight;
        
        // Altura de cámara sube fluidamente con scroll
        const targetCameraY = baseHeight + (this.scrollProgress * heightRange);
        
        // Zoom se acerca progresivamente
        const baseZoom = 60;  // Lejos (ver todo)
        const maxZoom = 38;   // Cerca (zoom final)
        const targetCameraZ = baseZoom - (this.scrollProgress * (baseZoom - maxZoom));
        
        // Transición ULTRA SUAVE
        this.camera.position.y = lerp(this.camera.position.y, targetCameraY, 0.04);
        this.camera.position.z = lerp(this.camera.position.z, targetCameraZ, 0.04);
        
        // Órbita lateral suave
        const orbitAngle = this.scrollProgress * Math.PI * 0.25;
        this.camera.position.x = lerp(
            this.camera.position.x,
            Math.sin(orbitAngle) * 6,
            0.04
        );
        
        // LookAt fluido
        this.camera.lookAt(0, targetCameraY, 0);


        // ILUMINACIÓN GRADUAL CONTINUA
        this.plantas.forEach((planta, index) => {
            // Scroll continuo de 0 a 5
            const plantaScroll = this.scrollProgress * 5;
            const plantaIndex = index + 1;
            
            // Distancia a planta actual
            const distance = Math.abs(plantaScroll - plantaIndex);
            
            // Factor de intensidad gradual (0 a 1)
            const intensityFactor = Math.max(0, 1 - (distance / 2));
            const targetIntensity = 0.3 + (intensityFactor * 1.7); // 0.3 a 2.0


            planta.userData.ventanas.forEach(ventana => {
                ventana.material.emissiveIntensity = lerp(
                    ventana.material.emissiveIntensity,
                    targetIntensity,
                    0.08
                );
            });


            // Escala gradual
            const targetScale = 1 + (intensityFactor * 0.08);
            planta.scale.x = lerp(planta.scale.x, targetScale, 0.08);
            planta.scale.z = lerp(planta.scale.z, targetScale, 0.08);


            // Accent light gradual
            if (this.accentLights[index]) {
                const lightIntensity = intensityFactor * 4.5;
                this.accentLights[index].intensity = lerp(
                    this.accentLights[index].intensity,
                    lightIntensity,
                    0.12
                );
                this.accentLights[index].color.setHex(planta.userData.color.color);
            }
        });


        // ANIMACIONES PROCEDURALES
        const time = Date.now() * 0.001;


        // Esferas antena
        this.edificioGroup.children.forEach(child => {
            if (child.geometry instanceof THREE.SphereGeometry && child.userData.pulseOffset !== undefined) {
                const offset = child.userData.pulseOffset;
                child.material.emissiveIntensity = 2.5 + Math.sin(time * 3 + offset) * 1.2;
                child.scale.setScalar(1 + Math.sin(time * 2.5 + offset) * 0.3);
            }
        });


        // Anillos base
        this.edificioGroup.children.forEach(child => {
            if (child.geometry instanceof THREE.TorusGeometry) {
                child.rotation.z = time * 0.3;
            }
        });


        this.renderer.render(this.scene, this.camera);
    }


    onResize() {
        const wrapper = document.querySelector('.edificio-wrapper');
        if (!wrapper) return;


        const width = wrapper.offsetWidth;
        const height = wrapper.offsetHeight;


        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}


/* ========================================
   INICIALIZACIÓN
   ======================================== */


window.addEventListener('load', () => {
    const edificio = new EdificioIT();


    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(15, 23, 42, 0.98)';
            navbar.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    }, { passive: true });


    console.log('🏢 Edificio IT fluido cargado');
    console.log('✅ Bajada continua suave sin saltos');
    console.log('🎯 Rotación y zoom fluidos');
    console.log('🎮 Overlay activado al centrar planta');
});
