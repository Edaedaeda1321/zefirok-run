import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {roadMaskId, spriteMetadata, catalogSpriteId} from '../sprite-assets.js';
import {makeInitialCity, sanitizeCity, dims} from '../engine.js';
import {CATALOG} from '../catalog.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const meta=(id)=>{const a=spriteMetadata(id);assert.ok(a,id);return a;};
const originalRoadHashes=Object.freeze({
  "world_road_mask_00": "70c3a9131d275b9316bf14b3bd918ba1c601847dccd35d391d4a45fd9621a36b",
  "world_road_mask_01": "aee17a249d3bf76cd90878af29d665b4fee9f3315842d81d2ad3f87e8c94163f",
  "world_road_mask_02": "4a92bb092bf2b4402d209bbc305e331d2795a21269cc91833a9c266da0074b4b",
  "world_road_mask_03": "074b0f8246aa3f2c237f8d24ed656f22c7cdc06303859a053b081c6cd2ef0fb0",
  "world_road_mask_04": "d3ba6f62262b3ee3baea9b35feba9d815909933c0c4c76f955dcf158769ecda1",
  "world_road_mask_05": "48e967142e39bb7c9a3d448fd7b7ee65a55f5fb607875138405c890e672bcffd",
  "world_road_mask_06": "f88809573b537791470825c5a5597d98269e18f74897d91c5b447c8ec047def8",
  "world_road_mask_07": "2dbebe621c0594b83622081abf587c13d3e5a072c0584ea503c7ebe0f76b6f08",
  "world_road_mask_08": "7f3b04b3c242b4790e02f51789ecf387fedb8df3773249727385c14c96688252",
  "world_road_mask_09": "f73bf9bb0072c63923eed51159c8c12ba00dec4366c605b08496444b08f27afb",
  "world_road_mask_10": "72d65a42689a9ed0ae96c38dc1f5867f94d71145fd92a8e15c8848c3cdb29a1f",
  "world_road_mask_11": "04cc2a32703401cdb529ccb6bd6359383c3bb3840f628c22d5b210d182570dab",
  "world_road_mask_12": "07b18cc0fe4a0d3ff673c38b63707719b07c23f401534981d74bf1f9e4f7765c",
  "world_road_mask_13": "aaf21830e48c16e4791ac813b7a9f980dedd37549876b6a82b7c720a8160fbf1",
  "world_road_mask_14": "d1fca333c12ab87c7fb130cc0dc5325ac8890266d73cc74196c36b8e2abd96a9",
  "world_road_mask_15": "b448b68a258548872f1632440fec4570bcf643b7d60aece03d6bf6b5326995d2",
  "world_road_entry_special": "e1e355a4cedae9f123a5d1c4eeab4c8f8f731dcc308dd92f96045173bc67ee78"
});

test('all 17 road images exactly match pre-update v0.1.11 assets',()=>{
  for(const [id,expected] of Object.entries(originalRoadHashes)){
    const asset=meta(id);
    assert.ok(asset.fileWebp.endsWith(`${id}.webp`));
    const bytes=readFileSync(join(root,asset.fileWebp));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,id);
    assert.equal(asset.assetScale,3);
    assert.ok(asset.width>=144&&asset.width<=192,id);
    assert.ok(asset.height>=105&&asset.height<=120,id);
  }
});

test('road connectivity topology and IDs remain unchanged for saved cities',()=>{
  for(let mask=0;mask<16;mask++){
    const points=[];
    if(mask&1)points.push('0,-1');
    if(mask&2)points.push('1,0');
    if(mask&4)points.push('0,1');
    if(mask&8)points.push('-1,0');
    assert.equal(roadMaskId(new Set(points),0,0),`world_road_mask_${String(mask).padStart(2,'0')}`);
  }
  const city=makeInitialCity();
  const saved=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
  assert.deepEqual(saved.roads,city.roads);
});

test('v0.1.12 bench grounding survives Roads rollback in all 4 directions',()=>{
  const opaqueFootBottom={n:247,e:273,s:191,w:258};
  for(const kind of ['bench','extra-bench']){
    assert.equal(CATALOG[kind].w,1);
    assert.equal(CATALOG[kind].h,1);
    for(let rotation=0;rotation<4;rotation++){
      const face='nesw'[rotation];
      const a=meta(catalogSpriteId(kind,rotation));
      assert.equal(a.id,`flower_v1_bench_${face}`);
      assert.deepEqual(dims(CATALOG[kind],rotation),{w:1,h:1});
      assert.ok(a.width/a.assetScale<72,'bench wider than one tile');
      const footY=(opaqueFootBottom[face]-a.anchorY)/a.assetScale;
      assert.ok(Math.abs(footY-26)<.5,`${face} hovers: footY=${footY}`);
      assert.ok(Math.abs(a.anchorX/a.assetScale-a.width/a.assetScale/2)<1,`${face} off horizontal center`);
    }
  }
});

test('runtime and disk manifest contain identical restored roads and grounded benches',()=>{
  const disk=JSON.parse(readFileSync(join(root,'assets/manifest.json'),'utf8'));
  const idx=new Map(disk.assets.map(a=>[a.id,a]));
  for(const id of [...Object.keys(originalRoadHashes),...Array.from('nesw',f=>`flower_v1_bench_${f}`)]){
    assert.deepEqual(idx.get(id),meta(id),id);
  }
  assert.equal(disk.assets.length,SPRITE_MANIFEST.assets.length);
});
