export function assertUniqueIds(items: Array<{ id: string }>, label: string) {
  const ids = items.map((item) => item.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicates.length > 0) {
    throw new Error(`${label} contains duplicate ids: ${duplicates.join(", ")}`);
  }
}
