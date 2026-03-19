import { createStore } from 'vuex'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ScenePreview from '../ScenePreview.vue'

const RoomListPanelStub = {
  name: 'RoomListPanel',
  props: ['rooms', 'value', 'sortOrder'],
  emits: ['change', 'update:sortOrder'],
  template: '<div class="room-list-panel-stub"></div>'
}

const tdesignStubs = {
  't-card': true,
  't-space': true,
  't-button': true,
  't-radio-group': true,
  't-radio-button': true,
  't-input': true,
  't-loading': true,
  't-list': true,
  't-list-item': true,
  't-empty': true,
  't-pagination': true,
  't-image-viewer': true,
  't-checkbox': true,
  't-select': true,
  't-option': true,
  't-dialog': true,
  't-alert': true,
  't-upload': true
}

const createStoreWithRooms = (rooms) => createStore({
  getters: {
    scenes: () => [],
    roomsTree: () => rooms
  },
  actions: {
    fetchSceneNameMap: vi.fn().mockResolvedValue({}),
    fetchStyleImages: vi.fn().mockResolvedValue([])
  }
})

const createWrapper = (rooms) => shallowMount(ScenePreview, {
  global: {
    plugins: [createStoreWithRooms(rooms)],
    stubs: {
      ...tdesignStubs,
      RoomListPanel: RoomListPanelStub
    }
  }
})

describe('ScenePreview room sorting', () => {
  it('keeps selected room id and syncs sorted room list when sort order changes', async () => {
    const wrapper = createWrapper([
      { id: 'room-2', name: 'Room 2' },
      { id: 'room-10', name: 'Room 10' },
      { id: 'room-1', name: 'Room 1' }
    ])
    await flushPromises()

    wrapper.vm.selectedRoomId = 'room-2'
    await wrapper.vm.$nextTick()

    const roomPanel = wrapper.findComponent(RoomListPanelStub)
    roomPanel.vm.$emit('update:sortOrder', 'desc')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.roomSortOrder).toBe('desc')
    expect(wrapper.vm.sortedRoomsForSelect.map((room) => room.id)).toEqual([
      'room-10',
      'room-2',
      'room-1'
    ])
    expect(wrapper.vm.selectedRoomId).toBe('room-2')
  })

  it('handles empty room data without crashing', async () => {
    const wrapper = createWrapper([])
    await flushPromises()
    expect(wrapper.vm.sortedRoomsForSelect).toEqual([])
    expect(wrapper.exists()).toBe(true)
  })
})
