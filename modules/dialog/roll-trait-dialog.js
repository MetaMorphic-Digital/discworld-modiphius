export default async function rollTraitDialog(actor, trait) {
  const { DialogV2 } = foundry.applications.api;
  const content = await renderTemplate(
    "systems/discworld/templates/roll-trait-prompt.hbs",
    { trait, actor },
  );

  const playerDice = ["d4", "d6", "d10", "d12"];
  const buttons = playerDice.map((die) => {
    return { class: [die], label: die, action: die };
  });

  return DialogV2.wait({
    classes: ["discworld"],
    position: { width: 400, height: "auto" },
    window: { title: "DISCWORLD.dialog.rollTrait.title" },
    content,
    buttons,
    rejectClose: false,
  });
}
