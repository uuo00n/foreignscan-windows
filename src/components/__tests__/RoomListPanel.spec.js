import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import RoomListPanel from '../RoomListPanel.vue'

const TMenu = {
  props: ['value'],
  template: '<div class="t-menu"><slot /></div>'
}

const TMenuItem = {
  props: ['value'],
  template: '<div class="t-menu-item" :data-value="value"><slot /></div>'
}

const TEmpty = {
  props: ['description'],
  template: '<div class="t-empty">{{ description }}</div>'
}

const TRadioGroup = {
  props: ['value'],
  emits: ['change'],
  template: `
    <div class="t-radio-group">
      <button class="switch-desc" @click="$emit('change', 'desc')">desc</button>
      <button class="switch-asc" @click="$emit('change', 'asc')">asc</button>
      <slot />
    </div>
  `
}

const TRadioButton = {
  props: ['value'],
  template: '<span class="t-radio-button" :data-value="value"><slot /></span>'
}

const createWrapper = (props = {}) => mount(RoomListPanel, {
  props: {
    rooms: [
      { id: 'room-2', name: 'Room 2' },
      { id: 'room-10', name: 'Room 10' },
      { id: 'room-1', name: 'Room 1' },
      { id: 'same-b', name: 'Same' },
      { id: 'same-a', name: 'Same' }
    ],
    value: 'room-2',
    ...props
  },
  global: {
    components: {
      't-menu': TMenu,
      't-menu-item': TMenuItem,
      't-empty': TEmpty,
      't-radio-group': TRadioGroup,
      't-radio-button': TRadioButton
    }
  }
})

describe('RoomListPanel', () => {
  it('uses ascending order by default', () => {
    const wrapper = createWrapper()
    expect(wrapper.vm.sortedRooms.map((room) => room.id)).toEqual([
      'room-1',
      'room-2',
      'room-10',
      'same-a',
      'same-b'
    ])
  })

  it('switches to descending order and keeps current selection value', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.switch-desc').trigger('click')
    expect(wrapper.emitted('update:sortOrder')).toEqual([['desc']])

    await wrapper.setProps({ sortOrder: 'desc' })
    expect(wrapper.vm.sortedRooms.map((room) => room.id)).toEqual([
      'same-b',
      'same-a',
      'room-10',
      'room-2',
      'room-1'
    ])
    expect(wrapper.vm.menuValue).toBe('room-2')
  })
})
