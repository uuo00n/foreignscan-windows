import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ImageViewer from '../ImageViewer.vue'
import { createStore } from 'vuex'

// Mock TDesign components
const TTag = { template: '<span><slot /></span>' }
const TButton = { template: '<button><slot /></button>' }
const TAlert = { template: '<div></div>' }
const TEmpty = { template: '<div></div>' }

describe('ImageViewer', () => {
    const store = createStore({
        state: {
            currentImage: { id: 'test-img', path: 'test.jpg' },
            currentRecord: { id: 'test-rec', status: 'detected' },
            detectionResults: [],
            backendStatus: 'ok',
            showResultsPanel: false,
            sceneNameMap: {}
        },
        actions: {
            setDetectionResults: vi.fn(),
            setShowResultsPanel: vi.fn(),
            fetchDetectionsByImage: vi.fn()
        }
    })

    it('renders correctly', () => {
        const wrapper = mount(ImageViewer, {
            global: {
                plugins: [store],
                components: {
                    't-tag': TTag,
                    't-button': TButton,
                    't-alert': TAlert,
                    't-empty': TEmpty
                }
            }
        })
        expect(wrapper.exists()).toBe(true)
        expect(wrapper.find('img').attributes('src')).toBe('test.jpg')
    })
})
