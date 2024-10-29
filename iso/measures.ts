import { MeasureId, Unit } from "./protocol.js";

export type Measure = {
  id: MeasureId;
  name: string;
  description: string;
  unit: Unit;
  categories?: string[];
};

export const MEASURES: Measure[] = [
  {
    id: "height" as MeasureId,
    name: "height",
    description: "Your height",
    unit: "m",
  },
  {
    id: "weight" as MeasureId,
    name: "weight",
    description: "Your weight",
    unit: "kg",
  },
  {
    id: "apeindex" as MeasureId,
    name: "Ape Index",
    description: "Your ape index (as a positive or negative number)",
    unit: "m",
  },
  {
    id: "sex-at-birth" as MeasureId,
    name: "Sex assigned at birth",
    description: "The sex that was assigned to you at birth",
    unit: "category",
    categories: ["female", "male"],
  },
  {
    id: "maxhang-20mm-7s-open" as MeasureId,
    name: "MaxHang: 20mm, 7s, open-hand grip",
    description: `\
Warm up thoroughly.

Find a 20mm edge. Using an open-hand grip, hang for 7s. If the hang is successful, increase weight and try again after at least a 5m rest.

If you cannot hang your bodyweight, use a pulley system to remove weight.

Record the maximum successful hang weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
    unit: "kg",
  },
  {
    id: "maxhang-20mm-7s-half" as MeasureId,
    name: "MaxHang: 20mm, 7s, half-crimp grip",
    description: `\
Warm up thoroughly.

Find a 20mm edge. Using a half-crimp grip, hang for 7s. If the hang is successful, increase weight and try again after at least a 5m rest.

A half-crimp grip is one where the DIP joint of your index, middle and ring fingers are hyperextended.

If you cannot hang your bodyweight, use a pulley system to remove weight.

Record the maximum successful hang weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
    unit: "kg",
  },
  {
    id: "maxhang-20mm-7s-full" as MeasureId,
    name: "MaxHang: 20mm, 7s, full-crimp grip",
    description: `\
Warm up thoroughly.

Find a 20mm edge. Using a full-crimp grip, hang for 7s. If the hang is successful, increase weight and try again after at least a 5m rest.

A full-crimp grip is one where the DIP joint of your index, middle and ring fingers are hyperextended, and your thumb is wrapped around at least the index finger.

If you cannot hang your bodyweight, use a pulley system to remove weight.

Record the maximum successful hang weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
    unit: "kg",
  },
{
    id: "2rm-max-pullup" as MeasureId,
    name: "2RM max pull up",
    description: `\
Warm up thoroughly.

Do 2 weighted pullups. If you are successful, increase weight and try again after at least a 5m rest.

A successful rep is one where the chin rises above the bar.

If you cannot do 2 pullups at bodyweight, use a pulley system to remove weight.

Record the maximum successful attempt weight, including your bodyweight.

So for example, if you weigh 70kg, and you removed 20kg, you would record 50kg.
If you weigh 70kg, and you added 30kg, you'd record 100kg.
`,
    unit: "kg",
  }
];
