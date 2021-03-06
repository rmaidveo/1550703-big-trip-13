import {render, RenderPosition, remove} from "../utils/render.js";
import {SortType, UpdateType, UserAction, FilterType, State} from "../constants.js";
import {sortByTime, sortByPrice, sortByDay} from "../utils/trip.js";
import {filter} from "../utils/filter.js";
import SiteSortView from "../view/site-sort.js";
import TripListView from "../view/trip-list";
import NoTripView from "../view/no-trip.js";
import PointPresenter from "./point.js";
import PointNewPresenter from "./point-new.js";
import LoadingView from "../view/loading.js";
import NewPointAddButtonfrom from "../view/new-point-button.js";


export default class Trip {
  constructor(menuContainer, boardContainer, tripsModel, filterModel, offersModel, destinationsModel, api) {
    this._tripsModel = tripsModel;
    this._filterModel = filterModel;
    this._offersModel = offersModel;
    this._destinationsModel = destinationsModel;
    this._api = api;
    this._menuContainer = menuContainer;
    this._boardContainer = boardContainer;
    this._tripListComponent = new TripListView();
    this._currentSort = SortType.DEFAULT;
    this._isLoading = true;
    this._tripSortComponent = null;
    this._addNewPointButton = new NewPointAddButtonfrom();
    this._noTripComponent = new NoTripView();
    this._loadingComponent = new LoadingView();
    this._pointPresenter = {};
    this._onViewActionChange = this._onViewActionChange.bind(this);
    this._onModelEventChange = this._onModelEventChange.bind(this);
    this._onModeChange = this._onModeChange.bind(this);
    this._onSortTypeChange = this._onSortTypeChange.bind(this);
    this._pointNewPresenter = new PointNewPresenter(this._tripListComponent, this._onViewActionChange, this._destinationsModel, this._offersModel);
  }

  init() {
    render(this._boardContainer, this._tripListComponent, RenderPosition.AFTERBEGIN);
    this._tripsModel.addObserver(this._onModelEventChange);
    this._filterModel.addObserver(this._onModelEventChange);
    this._renderBoard();
  }

  _getTrips() {
    const filterType = this._filterModel.getFilter();
    const trips = this._tripsModel.getPoints().slice();
    const filtredTrips = filter[filterType](trips);

    switch (this._currentSort) {
      case SortType.TIME:
        return filtredTrips.sort(sortByTime());
      case SortType.PRICE:
        return filtredTrips.sort(sortByPrice());
    }
    return filtredTrips.sort(sortByDay());
  }

  createPoint() {
    this._currentSort = SortType.DEFAULT;
    this._filterModel.setFilter(UpdateType.MAJOR, FilterType.EVERYTHING);
    this._pointNewPresenter.init();
    remove(this._noTripComponent);
    document.querySelector(`.trip-main__event-add-btn`).setAttribute(`disabled`, `disabled`);
  }

  _onSortTypeChange(sortType) {
    if (this._currentSort === sortType) {
      return;
    }
    this._currentSort = sortType;
    this._clearBoard();
    this._renderBoard();
  }

  _onModeChange() {
    this._pointNewPresenter.destroy();
    Object
      .values(this._pointPresenter)
      .forEach((presenter) => presenter.resetView());
  }

  _onViewActionChange(actionType, updateType, update) {
    switch (actionType) {
      case UserAction.UPDATE_POINT:
        this._pointPresenter[update.id].setViewState(State.SAVING);
        this._api.updatedPoints(update)
        .then((response) => {
          this._tripsModel.updatePoint(updateType, response);
        })
         .catch(() => {
           this._pointPresenter[update.id].setViewState(State.ABORTING);
         });
        break;
      case UserAction.ADD_POINT:
        this._pointNewPresenter.setSaving();
        this._api.addPoint(update)
        .then((response) => {
          this._tripsModel.addPoint(updateType, response);
        })
        .catch(() => {
          this._pointNewPresenter.setAborting();
        });
        break;
      case UserAction.DELETE_POINT:
        this._pointPresenter[update.id].setViewState(State.DELETING);
        this._api.deletePoint(update).then(() => {
          this._tripsModel.deletePoint(updateType, update);
        });
        break;
    }
  }

  _onModelEventChange(updateType, data) {
    switch (updateType) {
      case UpdateType.PATCH:
        this._pointPresenter[data.id].init(data, this._offersModel);
        break;
      case UpdateType.MINOR:
        this._clearBoard();
        this._renderBoard();
        break;
      case UpdateType.MAJOR:
        this._clearBoard({resetSortType: true});
        this._renderBoard();
        break;
      case UpdateType.INIT:
        this._isLoading = false;
        remove(this._loadingComponent);
        this._renderBoard();
        break;
    }
  }

  _renderSort() {
    if (this._tripSortComponent !== null) {
      this._tripSortComponent = null;
    }
    this._tripSortComponent = new SiteSortView(this._currentSort);
    this._tripSortComponent.setOnSortTypeClick(this._onSortTypeChange);
    render(this._boardContainer, this._tripSortComponent, RenderPosition.AFTERBEGIN);
  }

  _renderAddNewPointButton() {
    render(this._menuContainer, this._addNewPointButton, RenderPosition.BEFOREEND);
  }

  _renderTrip(trip) {
    const pointPresenter = new PointPresenter(this._tripListComponent, this._onViewActionChange, this._onModeChange, this._destinationsModel, this._offersModel);
    pointPresenter.init(trip);
    this._pointPresenter[trip.id] = pointPresenter;
  }

  _renderTrips(trips) {
    trips.forEach((trip) => this._renderTrip(trip));
  }

  _renderLoading() {
    render(this._boardContainer, this._loadingComponent, RenderPosition.AFTERBEGIN);
  }


  _renderNoTrips() {
    render(this._boardContainer, this._noTripComponent, RenderPosition.AFTERBEGIN);
  }

  _clearBoard({resetSortType = false} = {}) {
    this._pointNewPresenter.destroy();
    Object
      .values(this._pointPresenter)
      .forEach((presenter) => presenter.destroy());
    this._pointPresenter = {};

    remove(this._tripSortComponent);
    remove(this._noTripComponent);
    remove(this._loadingComponent);

    if (resetSortType) {
      this._currentSort = SortType.DEFAULT;
    }

  }

  _renderBoard() {
    if (this._isLoading) {
      this._renderLoading();
      return;
    }

    const trips = this._getTrips();
    const tripCount = trips.length;
    if (tripCount === 0) {
      this._renderNoTrips();
      return;
    }

    this._renderAddNewPointButton();
    this._renderSort();
    this._renderTrips(trips);
    document.querySelector(`.trip-main__event-add-btn`).removeAttribute(`disabled`, `disabled`);
  }

  hide() {
    this._tripListComponent.hide();
    this._tripSortComponent.hide();
    this._tripsModel.removeObserver(this._onModelEventChange);
    this._filterModel.removeObserver(this._onModelEventChange);

  }

  show() {
    this._tripListComponent.show();
    this._tripSortComponent.show();
    this._clearBoard({resetSortType: true});
    this._renderBoard();
    this._tripsModel.addObserver(this._onModelEventChange);
    this._filterModel.addObserver(this._onModelEventChange);
  }
}
