import 'jest-dom/extend-expect'
import 'react-testing-library/cleanup-after-each'
import React from 'react'
import {fake, build, sequence} from 'test-data-bot'
import * as ReactRouter from 'react-router-dom'
import {Router} from 'react-router-dom'
import {createMemoryHistory} from 'history'
import {createStore} from 'redux'
import {Provider} from 'react-redux'
import {
  render,
  fireEvent,
  wait,
  waitForElement,
  within,
} from 'react-testing-library'

import {FavoriteNumber} from '../favorite-number'
import {GreetingLoader} from '../greeting-loader-01-mocking'
import {HiddenMessage} from '../hidden-message'
import {ErrorBoundary} from '../error-boundary'
import {Editor} from '../post-editor-01-markup'
import {Main} from '../main'
import {reducer, ConnectedCounter} from '../redux-app'
import {Toggle} from '../toggle'
import {Modal} from '../modal'
import {Countdown} from '../countdown'

import {
  loadGreeting as mockLoadGreeting,
  reportError as mockReportError,
  savePost as mockSavePost,
} from '../api'

jest.mock('react-transition-group', () => ({
  CSSTransition: props => (props.in ? props.children : null),
}))

jest.mock('../api', () => ({
  loadGreeting: jest.fn(data =>
    Promise.resolve({data: {greeting: `Hi ${data}`}}),
  ),
  reportError: jest.fn(() => Promise.resolve({success: true})),
  savePost: jest.fn(() => Promise.resolve()),
}))

// jest.mock('react-router-dom', () => ({
//   Redirect: jest.fn(() => null),
// }))

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  console.error.mockRestore()
  // MockRedirect.mockClear()
  mockSavePost.mockClear()
  mockReportError.mockClear()
  mockLoadGreeting.mockClear()
})

// import {getQueriesForElement, prettyDOM} from 'dom-testing-library'

// function render(ui) {
//   const container = document.createElement('div')
//   ReactDOM.render(ui, container)
//   const querries = getQueriesForElement(container)

//   return {
//     container,
//     ...querries,
//   }
// }

test('renders a number input with a label "Favorite Number"', () => {
  const {
    getByLabelText,
    container,
    getByText,
    getByTestId,
    queryByText,
    rerender,
  } = render(<FavoriteNumber />)
  const input = getByLabelText(/favorite number/i)
  // debug(input)
  fireEvent.change(input, {target: {value: 10}})
  // debug(input)

  expect(input).toHaveAttribute('type', 'number')
  expect(container).toHaveTextContent(/the number is invalid/i)

  expect(getByText(/the number is invalid/i)).toBeTruthy()
  expect(getByText(/the number is invalid/i)).toBeInTheDocument()
  expect(getByTestId('error-message')).toBeInTheDocument()

  rerender(<FavoriteNumber max={10} />)
  expect(queryByText(/the number is invalid/i)).toBeFalsy()
})

test('loads greeting on click', async () => {
  const {getByLabelText, getByText, getByTestId} = render(<GreetingLoader />)
  const input = getByLabelText(/name/i)
  const button = getByText(/load/i)
  const greeting = getByTestId('greeting')

  input.value = 'Patryk'

  fireEvent.click(button)
  await wait(() => expect(greeting).toHaveTextContent('Hi Patryk'))
  expect(mockLoadGreeting).toHaveBeenCalledTimes(1)
  expect(mockLoadGreeting).toHaveBeenCalledWith('Patryk')
})

test('should toggle hidden message', () => {
  const messageText = 'Hello world'
  const {getByText, queryByText} = render(
    <HiddenMessage>{messageText}</HiddenMessage>,
  )

  const button = getByText(/toggle/i)
  expect(queryByText(messageText)).not.toBeInTheDocument()
  fireEvent.click(button)
  expect(getByText(messageText)).toBeInTheDocument()
  fireEvent.click(button)
  expect(queryByText(messageText)).not.toBeInTheDocument()
})

test('should throw error if there is a problem', () => {
  const Bomb = ({shouldThrow}) => {
    if (shouldThrow) throw new Error('error')

    return null
  }

  const {rerender, container, getByText} = render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )

  rerender(
    <ErrorBoundary>
      <Bomb shouldThrow />
    </ErrorBoundary>,
  )

  expect(mockReportError).toHaveBeenCalledTimes(1)
  const error = expect.any(Error)
  const info = {componentStack: expect.stringContaining('Bomb')}
  expect(mockReportError).toHaveBeenCalledWith(error, info)

  expect(container).toHaveTextContent('There was a problem')

  console.error.mockClear()
  mockReportError.mockClear()

  rerender(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )

  fireEvent.click(getByText(/try again/i))

  expect(mockReportError).not.toHaveBeenCalled()
  expect(container).not.toHaveTextContent('There was a problem')
  expect(console.error).not.toHaveBeenCalled()
})

const userBuilder = build('User').fields({
  id: sequence(s => `user-${s}`),
})

const postBuilder = build('Post').fields({
  title: fake(f => f.lorem.words()),
  content: fake(f => f.lorem.paragraphs().replace(/\r/g, '')),
  tags: fake(f => [f.lorem.word(), f.lorem.word()]),
})

const renderEditor = () => {
  const user = userBuilder()
  const post = postBuilder()
  const utils = render(<Editor user={user} />)

  utils.getByLabelText(/title/i).value = post.title
  utils.getByLabelText(/content/i).value = post.content
  utils.getByLabelText(/tags/i).value = post.tags.join(', ')

  const button = utils.getByText(/submit/i)

  return {
    ...utils,
    user,
    post,
    button,
  }
}

test('should render form', async () => {
  jest.spyOn(ReactRouter, 'Redirect')
  ReactRouter.Redirect.mockImplementation(() => null)
  const preDate = Date.now()
  const {button, post, user} = renderEditor()

  fireEvent.click(button)

  expect(button).toBeDisabled()
  expect(mockSavePost).toHaveBeenCalledTimes(1)
  expect(mockSavePost).toHaveBeenCalledWith({
    ...post,
    date: expect.any(String),
    authorId: user.id,
  })
  const postDate = Date.now()

  const date = new Date(mockSavePost.mock.calls[0][0].date).getTime()

  expect(date).toBeGreaterThanOrEqual(preDate)
  expect(date).toBeLessThanOrEqual(postDate)

  await wait(() => expect(ReactRouter.Redirect).toHaveBeenCalledTimes(1))
  expect(ReactRouter.Redirect).toHaveBeenCalledWith({to: '/'}, {})
})

test('should render error on fail', async () => {
  const errorMgs = 'test error'

  mockSavePost.mockRejectedValueOnce({data: {error: errorMgs}})

  const {button, getByTestId} = renderEditor()

  fireEvent.click(button)

  const postError = await waitForElement(() => getByTestId('error-msg'))
  expect(postError).toHaveTextContent(errorMgs)
  expect(button).not.toBeDisabled()
})

const renderWithRouter = (
  ui,
  {
    route = '/',
    history = createMemoryHistory({initialEntries: [route]}),
    ...options
  } = {},
) => ({
  ...render(<Router history={history}>{ui}</Router>, options),
  history,
})

test('should render router components', () => {
  const {getByText, getByTestId, queryByTestId} = renderWithRouter(<Main />)
  expect(getByTestId('home-screen')).toBeInTheDocument()
  expect(queryByTestId('about-screen')).not.toBeInTheDocument()

  fireEvent.click(getByText(/about/i))

  expect(getByTestId('about-screen')).toBeInTheDocument()
  expect(queryByTestId('home-screen')).not.toBeInTheDocument()
})

test('should render no match component', () => {
  const {getByTestId} = renderWithRouter(<Main />, {route: '/wrong-path'})

  expect(getByTestId('no-match-screen')).toBeInTheDocument()
})

const renderWithRedux = (
  ui,
  {
    initialState,
    initialReducer = reducer,
    store = createStore(initialReducer, initialState),
    ...options
  } = {},
) => ({
  ...render(<Provider store={store}>{ui}</Provider>, options),
})

test('should render with redux defaults', () => {
  const {getByText, getByTestId} = renderWithRedux(<ConnectedCounter />)

  fireEvent.click(getByText('+'))
  expect(getByTestId('count-value')).toHaveTextContent('1')
})

test('should render with redux initial state', () => {
  const {getByText, getByTestId} = renderWithRedux(<ConnectedCounter />, {
    initialState: {count: 3},
  })

  fireEvent.click(getByText('-'))
  expect(getByTestId('count-value')).toHaveTextContent('2')
})

test('should test render prop func', () => {
  const state = {}
  const renderPropFunc = arg => {
    Object.assign(state, arg)

    return null
  }
  render(<Toggle>{renderPropFunc}</Toggle>)

  expect(state).toEqual({on: false, toggle: expect.any(Function)})
  state.toggle()
  expect(state).toEqual({on: true, toggle: expect.any(Function)})
})

test('should render modal', () => {
  render(
    <Modal>
      <div>test</div>
    </Modal>,
  )
  const {getByText} = within(document.getElementById('modal-root'))
  expect(getByText('test')).toBeInTheDocument()
})

test('should unmount component', () => {
  jest.useFakeTimers()
  const {unmount} = render(<Countdown />)
  unmount()
  jest.runOnlyPendingTimers()
  expect(console.error).not.toHaveBeenCalled()
})
