type ItemType = {
  id: string
  title: string
  text: string
}
type DataType = {
  lastIdx: number
  lastSave: number | undefined
  items: Array<ItemType>
}
