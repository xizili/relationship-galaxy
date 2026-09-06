// Regression guard: removal must save work, not merely hide the particles.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /goldDust|createGoldDust|gold-dust/, "入口中不得保留粒子导入、创建或每帧更新");
assert.equal(existsSync(new URL("../src/gold-dust.js", import.meta.url)), false, "不保留无用的粒子着色器模块");
assert.match(source, /const stars = makeStarField\(\)/, "保留原有远处星空");
assert.match(source, /updateRelationTour\(timestamp\)/, "保留关系巡游");
console.log("金色粒子移除检查通过：无额外粒子模块、初始化或逐帧更新；原有星空与关系巡游保留。");
