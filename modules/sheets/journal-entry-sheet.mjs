const { JournalEntrySheet } = foundry.applications.sheets.journal;

export default class DiscworldJournalEntrySheet extends JournalEntrySheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["discworld"],
  };
}
