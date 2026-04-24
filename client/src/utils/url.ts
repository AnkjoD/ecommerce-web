/* eslint-disable no-useless-escape */
export const removeSpecialCharacter = (str: string) =>
  str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g, '')

export const generateNameId = ({ name, id }: { name: string; id: string }) => {
  return removeSpecialCharacter(name).replace(/\s/g, '-').toLowerCase() + `-i.${id}`
}

export const getIdFromNameId = (nameId: string) => {
  const nameSplit = nameId.split('-i.')
  return nameSplit[nameSplit.length - 1]
}
