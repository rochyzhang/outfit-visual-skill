import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { SkillModule } from "@/features/skill/skill-module";
import { listWorkflowSkills } from "@/config/skills";

const html = renderToStaticMarkup(<SkillModule />);
const skills = listWorkflowSkills();

assert.match(html, /00/);
assert.match(html, /SKILL/);
assert.match(html, /Apply Skill/);
assert.match(html, /Required/);
assert.match(html, /Recommended/);
assert.match(html, /Defaults/);
assert.equal(skills.length, 6);

for (const skill of skills) {
  assert.match(html, new RegExp(skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

assert.match(html, /At least one of Top or Outer/);
assert.match(html, /Bottom/);
assert.match(html, /Shoes/);
assert.match(html, /Hat, Socks, Bag, Glasses, Accessory 01, Accessory 02, Prop 01, Prop 02/);
assert.doesNotMatch(html, /any_single/);
assert.doesNotMatch(html, /COUPLE/);

console.log("Skill UI render tests passed.");
