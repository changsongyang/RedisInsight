import { cloneDeep, isNull } from 'lodash'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { apiService } from 'uiSrc/services'
import { ApiEndpoints, KeyTypes } from 'uiSrc/constants'
import { getBasedOnViewTypeEvent, sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import {
  getUrl,
  Nullable,
  getApiErrorMessage,
  isStatusSuccessful,
  Maybe,
} from 'uiSrc/utils'
import {
  SetListElementDto,
  GetListElementsResponse,
  GetListElementResponse,
  SetListElementResponse,
  PushElementToListDto,
  DeleteListElementsDto, DeleteListElementsResponse,
} from 'apiSrc/modules/browser/dto/list.dto'

import successMessages from 'uiSrc/components/notifications/success-messages'
import { SCAN_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { StateList } from '../interfaces/list'
import { AppDispatch, RootState } from '../store'
import { addErrorNotification, addMessageNotification } from '../app/notifications'
import {
  refreshKeyInfoAction,
  fetchKeyInfo,
  deleteKeyFromList,
  deleteKeySuccess,
  updateSelectedKeyRefreshTime,
} from './keys'

export const initialState: StateList = {
  loading: false,
  error: '',
  data: {
    total: 0,
    key: '',
    keyName: '',
    elements: [],
    count: 0,
    offset: 0,
    searchedIndex: null,
  },
  updateValue: {
    loading: false,
    error: '',
  },
}

// A slice for recipes
const listSlice = createSlice({
  name: 'list',
  initialState,
  reducers: {
    setListInitialState: () => initialState,
    // load List elements
    loadListElements: (state, { payload: resetData = true }: PayloadAction<Maybe<boolean>>) => {
      state.loading = true
      state.error = ''

      if (resetData) {
        state.data = initialState.data
      }
    },
    loadListElementsSuccess: (
      state,
      { payload }: PayloadAction<GetListElementsResponse>
    ) => {
      state.data = {
        ...state.data,
        ...payload,
        key: payload.keyName,
      }
      state.loading = false
    },
    loadListElementsFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },

    // load more List elements for infinity scroll
    loadMoreListElements: (state) => {
      state.loading = true
      state.error = ''
      state.data.searchedIndex = initialState.data.searchedIndex
    },
    loadMoreListElementsSuccess: (
      state,
      { payload: { elements } }: PayloadAction<GetListElementsResponse>
    ) => {
      state.loading = false

      state.data.elements = state.data?.elements?.concat(elements)
    },
    loadMoreListElementsFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },

    // load searching List element by Index
    loadSearchingListElement: (
      state,
      { payload }: { payload: Nullable<number> }
    ) => {
      state.loading = true
      state.error = ''
      state.data = {
        ...state.data,
        elements: initialState.data.elements,
        searchedIndex: payload,
      }
    },
    loadSearchingListElementSuccess: (
      state,
      { payload: { value } }: PayloadAction<GetListElementResponse>
    ) => {
      state.loading = false

      state.data.elements = [value]
    },
    loadSearchingListElementFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },

    // Update List element
    updateValue: (state) => {
      state.updateValue = {
        ...state.updateValue,
        loading: true,
        error: '',
      }
    },
    updateValueSuccess: (state) => {
      state.updateValue = {
        ...state.updateValue,
        loading: false,
      }
    },
    updateValueFailure: (state, { payload }) => {
      state.updateValue = {
        ...state.updateValue,
        loading: false,
        error: payload,
      }
    },
    resetUpdateValue: (state) => {
      state.updateValue = cloneDeep(initialState.updateValue)
    },
    updateElementInList: (
      state,
      { payload }: { payload: SetListElementDto }
    ) => {
      state.data.elements[state.data.elements.length === 1 ? 0 : payload.index] = payload.element
    },
    insertListElements: (state) => {
      state.loading = true
      state.error = ''
    },
    insertListElementsSuccess: (state) => {
      state.loading = false
      state.error = ''
    },
    insertListElementsFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },
    deleteListElements: (state) => {
      state.loading = true
      state.error = ''
    },
    deleteListElementsSuccess: (state) => {
      state.loading = false
      state.error = ''
    },
    deleteListElementsFailure: (state, { payload }) => {
      state.loading = false
      state.error = payload
    },
  },
})

// Actions generated from the slice
export const {
  setListInitialState,
  loadListElements,
  loadListElementsSuccess,
  loadListElementsFailure,
  loadMoreListElements,
  loadMoreListElementsSuccess,
  loadMoreListElementsFailure,
  updateValue,
  updateValueSuccess,
  updateValueFailure,
  resetUpdateValue,
  updateElementInList,
  loadSearchingListElement,
  loadSearchingListElementSuccess,
  loadSearchingListElementFailure,
  insertListElements,
  insertListElementsFailure,
  insertListElementsSuccess,
  deleteListElements,
  deleteListElementsSuccess,
  deleteListElementsFailure,
} = listSlice.actions

// A selector
export const listSelector = (state: RootState) => state.browser.list
export const listDataSelector = (state: RootState) => state.browser.list?.data
export const updateListValueStateSelector = (state: RootState) =>
  state.browser.list?.updateValue

// The reducer
export default listSlice.reducer

// Asynchronous thunk actions
export function fetchListElements(key: string, offset: number, count: number, resetData?: boolean) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadListElements(resetData))

    try {
      const state = stateInit()
      let { data, status } = await apiService.post<GetListElementsResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.LIST_GET_ELEMENTS
        ),
        {
          keyName: key,
          offset,
          count,
        }
      )

      console.time('l1')
      data.elements = data.elements.map((element) => {
        // console.log('el', element)
        if(element.type === 'Buffer') {
          return {
            type: 'Buffer',
            data: new Uint8Array(element.data),
          }
        }
      })
      console.timeEnd('l1')

      if (isStatusSuccessful(status)) {
        dispatch(loadListElementsSuccess(data))
        dispatch(updateSelectedKeyRefreshTime(Date.now()))
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(loadListElementsFailure(errorMessage))
    }
  }
}

// Asynchronous thunk actions
export function fetchMoreListElements(
  key: string,
  offset: number,
  count: number
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadMoreListElements())

    try {
      const state = stateInit()
      const { data, status } = await apiService.post(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.LIST_GET_ELEMENTS
        ),
        {
          keyName: key,
          offset,
          count,
        }
      )

      if (isStatusSuccessful(status)) {
        dispatch(loadMoreListElementsSuccess(data))
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(loadMoreListElementsFailure(errorMessage))
    }
  }
}

// Asynchronous thunk actions
export function fetchSearchingListElementAction(
  key: string,
  index: Nullable<number>,
  onSuccess?: () => void,
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(loadSearchingListElement(index))

    try {
      const state = stateInit()
      const { data, status } = await apiService.post<GetListElementResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          `${ApiEndpoints.LIST_GET_ELEMENTS}/${index}`
        ),
        {
          keyName: key,
        }
      )

      if (isStatusSuccessful(status)) {
        dispatch(loadSearchingListElementSuccess(data))
        dispatch(updateSelectedKeyRefreshTime(Date.now()))
        onSuccess?.()
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(loadSearchingListElementFailure(errorMessage))
    }
  }
}

// Asynchronous thunk actions
export function refreshListElementsAction(key: string = '', resetData?: boolean) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    const state = stateInit()
    const { searchedIndex } = state.browser.list.data

    if (isNull(searchedIndex)) {
      dispatch<any>(fetchListElements(key, 0, SCAN_COUNT_DEFAULT, resetData))
    } else {
      dispatch<any>(fetchSearchingListElementAction(key, searchedIndex))
    }
  }
}

// Asynchronous thunk action
export function updateListElementAction(
  data: SetListElementDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(updateValue())
    try {
      const state = stateInit()
      const { status } = await apiService.patch<SetListElementResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.LIST
        ),
        data
      )
      if (isStatusSuccessful(status)) {
        onSuccessAction?.()
        dispatch(updateValueSuccess())
        dispatch(updateElementInList(data))
        sendEventTelemetry({
          event: getBasedOnViewTypeEvent(
            state.browser.keys?.viewType,
            TelemetryEvent.BROWSER_KEY_VALUE_EDITED,
            TelemetryEvent.TREE_VIEW_KEY_VALUE_EDITED
          ),
          eventData: {
            databaseId: state.connections.instances?.connectedInstance?.id,
            keyType: KeyTypes.List,
          }
        })
        dispatch<any>(refreshKeyInfoAction(data.keyName))
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(updateValueFailure(errorMessage))

      onFailAction?.()
    }
  }
}

// Asynchronous thunk action
export function insertListElementsAction(
  data: PushElementToListDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(insertListElements())
    try {
      const state = stateInit()
      const { status } = await apiService.put<PushElementToListDto>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.LIST
        ),
        data
      )
      if (isStatusSuccessful(status)) {
        onSuccessAction?.()
        dispatch(insertListElementsSuccess())
        dispatch<any>(fetchKeyInfo(data.keyName))
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(insertListElementsFailure(errorMessage))

      onFailAction?.()
    }
  }
}

// Asynchronous thunk action
export function deleteListElementsAction(
  data: DeleteListElementsDto,
  onSuccessAction?: () => void,
  onFailAction?: () => void
) {
  return async (dispatch: AppDispatch, stateInit: () => RootState) => {
    dispatch(deleteListElements())
    try {
      const state = stateInit()
      const { status, data: responseData } = await apiService.delete<DeleteListElementsResponse>(
        getUrl(
          state.connections.instances.connectedInstance?.id,
          ApiEndpoints.LIST_DELETE_ELEMENTS
        ),
        { data }
      )
      if (isStatusSuccessful(status)) {
        onSuccessAction?.()
        dispatch(deleteListElementsSuccess())
        if (state.browser.list.data?.total - data.count > 0) {
          dispatch<any>(fetchKeyInfo(data.keyName))
          dispatch(addMessageNotification(
            successMessages.REMOVED_LIST_ELEMENTS(
              data.keyName,
              data.count,
              responseData.elements
            )
          ))
        } else {
          dispatch(deleteKeySuccess())
          dispatch(deleteKeyFromList(data.keyName))
          dispatch(addMessageNotification(successMessages.DELETED_KEY(data.keyName)))
        }
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      dispatch(addErrorNotification(error))
      dispatch(deleteListElementsFailure(errorMessage))

      onFailAction?.()
    }
  }
}
