import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as THREE from 'three';
import { BrailleCell, BrailleDotMode } from '../braille.models';

@Component({
  selector: 'app-braille-3d-display',
  standalone: true,
  template: `
    <div class="display-shell">
      <canvas #canvas aria-hidden="true"></canvas>
      <p class="visually-hidden" role="status" aria-live="polite">
        Virtual {{ dotMode }}-dot Braille display showing {{ cells.length }} cells.
      </p>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 320px; }
    .display-shell {
      min-height: 320px;
      height: 100%;
      overflow: hidden;
      border-radius: 1.25rem;
      background: radial-gradient(circle at 50% 0%, #334155, #070b12 70%);
      box-shadow: inset 0 1px rgba(255,255,255,.12), 0 18px 45px rgba(2,6,23,.28);
    }
    canvas { width: 100%; height: 100%; min-height: 320px; display: block; }
  `]
})
export class Braille3dDisplayComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cells: BrailleCell[] = [];
  @Input() dotMode: BrailleDotMode = 6;
  @Input() maxCells = 20;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: any;
  private frameId = 0;
  private resizeObserver?: ResizeObserver;
  private pins: THREE.Mesh[] = [];
  private targetHeights: number[] = [];
  private base?: THREE.Mesh;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    // Import OrbitControls dynamically to avoid SSR issues if any, or just require it
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      this.initScene(OrbitControls);
      this.rebuildDisplay();
      this.zone.runOutsideAngular(() => this.animate());
    }).catch(err => {
      // Fallback without controls
      this.initScene();
      this.rebuildDisplay();
      this.zone.runOutsideAngular(() => this.animate());
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.scene && (changes['cells'] || changes['dotMode'] || changes['maxCells'])) {
      this.rebuildDisplay();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.disposeScene();
  }

  private initScene(OrbitControlsClass?: any): void {
    const canvas = this.canvasRef.nativeElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b12);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 7.8, 11);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    if (OrbitControlsClass) {
      this.controls = new OrbitControlsClass(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent going below ground
      this.controls.minDistance = 2;
      this.controls.maxDistance = 40;
    }

    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(-4, 8, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement!);
    this.resize();
  }

  private rebuildDisplay(): void {
    if (!this.scene) return;
    this.pins.forEach(pin => {
      this.scene!.remove(pin);
      pin.geometry.dispose();
      (pin.material as THREE.Material).dispose();
    });
    this.pins = [];
    this.targetHeights = [];
    if (this.base) {
      this.scene.remove(this.base);
      this.base.geometry.dispose();
      (this.base.material as THREE.Material).dispose();
    }

    const visibleCells = this.cells.slice(0, this.maxCells);
    const cellCount = Math.max(visibleCells.length, 1);
    const cellSpacing = 1.22;
    const width = Math.max(4.2, cellCount * cellSpacing + 1);

    const baseGeometry = new THREE.BoxGeometry(width, 0.55, this.dotMode === 8 ? 4.6 : 3.8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.68,
      roughness: 0.28
    });
    this.base = new THREE.Mesh(baseGeometry, baseMaterial);
    this.base.position.y = -0.34;
    this.base.receiveShadow = true;
    this.scene.add(this.base);

    const pinGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.5, 24);
    const columns = [0, 3, 1, 4, 2, 5, 6, 7];
    const rows = this.dotMode === 8 ? 4 : 3;

    visibleCells.forEach((cell, cellIndex) => {
      const startX = -(cellCount - 1) * cellSpacing / 2;
      for (let visualIndex = 0; visualIndex < rows * 2; visualIndex++) {
        const dotIndex = columns[visualIndex];
        const raised = cell.dots.includes(dotIndex + 1);
        const col = visualIndex % 2;
        const row = Math.floor(visualIndex / 2);
        const material = new THREE.MeshStandardMaterial({
          color: raised ? 0x60a5fa : 0x64748b,
          metalness: 0.88,
          roughness: 0.18,
          emissive: raised ? 0x0b3b73 : 0x000000,
          emissiveIntensity: raised ? 0.6 : 0
        });
        const pin = new THREE.Mesh(pinGeometry.clone(), material);
        pin.position.set(
          startX + cellIndex * cellSpacing + (col ? 0.21 : -0.21),
          0,
          (row - (rows - 1) / 2) * 0.62
        );
        pin.castShadow = true;
        pin.receiveShadow = true;
        this.pins.push(pin);
        this.targetHeights.push(raised ? 0.47 : 0.03);
        this.scene!.add(pin);
      }
    });

    const distance = Math.max(10, width * 0.76);
    this.camera!.position.set(0, Math.max(7, width * 0.32), distance);
    this.camera!.lookAt(0, 0, 0);
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    if (this.controls) {
      this.controls.update();
    }
    this.pins.forEach((pin, index) => {
      pin.position.y += (this.targetHeights[index] - pin.position.y) * 0.14;
    });
    this.renderer?.render(this.scene!, this.camera!);
  };

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const parent = this.canvasRef.nativeElement.parentElement!;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 320);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private disposeScene(): void {
    if (this.controls) {
      this.controls.dispose();
    }
    this.scene?.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
  }
}
