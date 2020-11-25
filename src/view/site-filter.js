const createFilterItemsTemplate = (filter, isChecked) => {
  const {
    name,
    count
  } = filter;
  return ` <div class="trip-filters__filter">
    <input id ="filter-${name}"
    class="trip-filters__filter-input  visually-hidden"
    type="radio"
    name="trip-filter"
    value = "${name}"
     ${isChecked ? `checked` : ``}
  ${count === 0 ? `disabled` : ``}>
    <label class="trip-filters__filter-label"
    for="filter-${name}">${name}</label>
  </div>`;
};
export const createSiteFilterTemplate = (filterItems) => {
  const filterItemsTemplate = filterItems
    .map((filter, index) => createFilterItemsTemplate(filter, index === 0))
    .join(``);
  return `<form class="trip-filters" action="#" method="get">
  ${filterItemsTemplate}
  <button class="visually-hidden" type="submit">Accept filter</button>
  </form>`;
};
