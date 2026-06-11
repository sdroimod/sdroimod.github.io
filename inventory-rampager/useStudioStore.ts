import { create } from 'zustand';
import { parseTextureAtlas, SpriteFrame } from '@/lib/spriteComposer';
import { githubPngUrl, resolveAssetPngUri } from '@/lib/studioAssets';

export interface StudioAsset {
  name: string;
  category: string;
  pngUrl: string;
  xmlUrl: string;
  frames?: SpriteFrame[];
  imgBitmap?: ImageBitmap;
  thumbnail?: ImageBitmap;
}

export type LayerKey = 'body' | 'skin' | 'armor';

interface StudioStore {
  armorList: StudioAsset[];
  bodyList: StudioAsset[];
  skinList: StudioAsset[];
  eyeList: StudioAsset[];
  artifactList: StudioAsset[];

  selectedArmor: number;
  selectedBody: number;
  selectedSkin: number;
  selectedEye: number;
  selectedArtifact: number;

  bodyTint: string | null;
  skinTint: string | null;
  eyeTint: string | null;

  layerOrder: LayerKey[];

  currentFrame: number;
  isPlaying: boolean;
  isLoaded: boolean;

  composeCache: Map<string, ImageBitmap>;

  loadManifest: () => Promise<void>;
  loadAssetData: (asset: StudioAsset) => Promise<StudioAsset>;
  setSelectedArmor: (idx: number) => void;
  setSelectedBody: (idx: number) => void;
  setSelectedSkin: (idx: number) => void;
  setSelectedEye: (idx: number) => void;
  setSelectedArtifact: (idx: number) => void;
  setBodyTint: (color: string | null) => void;
  setSkinTint: (color: string | null) => void;
  setEyeTint: (color: string | null) => void;
  setLayerOrder: (order: LayerKey[]) => void;
  setFrame: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
  clearCache: () => void;
  toggleSkinArmorOrder: () => void;
  getCacheKey: (armorIdx: number, bodyIdx: number, skinIdx: number, eyeIdx: number, artifactIdx: number, order: LayerKey[], frame: number) => string;
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  armorList: [],
  bodyList: [],
  skinList: [],
  eyeList: [],
  artifactList: [],

  selectedArmor: 0,
  selectedBody: 0,
  selectedSkin: 0,
  selectedEye: 0,
  selectedArtifact: 0,

  bodyTint: null,
  skinTint: null,
  eyeTint: null,

  layerOrder: ['body', 'armor', 'skin'],

  currentFrame: 0,
  isPlaying: false,
  isLoaded: false,

  composeCache: new Map(),

  loadManifest: async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}studio/manifest.json`);
    if (!res.ok) {
      console.error("Failed to load manifest in store:", res.status, res.statusText);
      return;
    }
    const manifest: { armor: string[]; body: string[]; skin: string[]; eye: string[]; artifact: string[] } = await res.json();

    const toAsset = (subdir: string, name: string): StudioAsset => ({
      name,
      category: subdir,
      pngUrl: githubPngUrl(subdir, name),
      xmlUrl: `${import.meta.env.BASE_URL}studio/${subdir}/${name}.xml`,
    });

    set({
      armorList: manifest.armor.map(n => toAsset('Armor', n)),
      bodyList: manifest.body.map(n => toAsset('Body', n)),
      skinList: manifest.skin.map(n => toAsset('HeadSkin', n)),
      eyeList: (manifest.eye ?? []).map(n => toAsset('Eye', n)),
      artifactList: (manifest.artifact ?? []).map(n => toAsset('Artifact', n)),
      isLoaded: true,
    });
  },

  loadAssetData: async (asset: StudioAsset): Promise<StudioAsset> => {
    if (asset.frames && asset.imgBitmap) return asset;

    const pngUri = await resolveAssetPngUri(asset.category, asset.name);
    const [xmlText, imgBlob] = await Promise.all([
      fetch(asset.xmlUrl).then(r => r.text()),
      fetch(pngUri).then(r => r.blob()),
    ]);

    let frames = parseTextureAtlas(xmlText);
    const imgBitmap = await createImageBitmap(imgBlob);

    if (asset.xmlUrl.includes('/Armor/')) {
      frames = frames.slice(0, 13);
    }

    // Normalize all frames to a consistent oW x oH so that compositing produces
    // the same canvas size for every frame (prevents inter-frame visual shifting).
    const maxOW = Math.max(...frames.map(f => f.oW));
    const maxOH = Math.max(...frames.map(f => f.oH));
    frames = frames.map(f =>
      f.oW === maxOW && f.oH === maxOH ? f : {
        ...f,
        oX: Math.round(f.oX + (maxOW - f.oW) * f.pX),
        oY: Math.round(f.oY + (maxOH - f.oH) * f.pY),
        oW: maxOW,
        oH: maxOH,
      }
    );

    return { ...asset, frames, imgBitmap };
  },

  setSelectedArmor: (idx) => set({ selectedArmor: idx }),
  setSelectedBody: (idx) => set({ selectedBody: idx }),
  setSelectedSkin: (idx) => set({ selectedSkin: idx }),
  setSelectedEye: (idx) => set({ selectedEye: idx }),
  setSelectedArtifact: (idx) => set({ selectedArtifact: idx }),
  setBodyTint: (color) => { get().clearCache(); set({ bodyTint: color }); },
  setSkinTint: (color) => { get().clearCache(); set({ skinTint: color }); },
  setEyeTint: (color) => { get().clearCache(); set({ eyeTint: color }); },
  setLayerOrder: (order) => {
    get().clearCache();
    set({ layerOrder: order });
  },
  setFrame: (frame) => set({ currentFrame: frame }),
  setPlaying: (playing) => set({ isPlaying: playing }),

  clearCache: () => set({ composeCache: new Map() }),

  toggleSkinArmorOrder: () => {
    get().clearCache();
    const order = get().layerOrder;
    // Current order has body at 0. Swap 1 and 2.
    if (order[1] === 'skin') {
      set({ layerOrder: ['body', 'armor', 'skin'] });
    } else {
      set({ layerOrder: ['body', 'skin', 'armor'] });
    }
  },

  getCacheKey: (armorIdx, bodyIdx, skinIdx, eyeIdx, artifactIdx, order, frame) => {
    const { bodyTint, skinTint, eyeTint } = get();
    return `b${bodyIdx}-bt${bodyTint ?? '0'}-s${skinIdx}-st${skinTint ?? '0'}-a${armorIdx}-e${eyeIdx}-et${eyeTint ?? '0'}-art${artifactIdx}-${order.join(',')}-f${frame}`;
  },
}));
