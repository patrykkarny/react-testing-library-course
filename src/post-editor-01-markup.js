import React from 'react'
import {Redirect} from 'react-router-dom'
import {savePost} from './api'

class Editor extends React.Component {
  state = {isSaving: false, redirect: false, error: null}
  handleSubmit = e => {
    e.preventDefault()

    const {title, content, tags} = e.target.elements
    const {user} = this.props
    const post = {
      title: title.value,
      content: content.value,
      tags: tags.value.split(', ').map(t => t.trim()),
      authorId: user.id,
      date: new Date().toISOString(),
    }

    this.setState({isSaving: true})
    savePost(post).then(
      () => this.setState({redirect: true}),
      response => this.setState({isSaving: false, error: response.data.error}),
    )
  }
  render() {
    if (this.state.redirect) {
      return <Redirect to="/" />
    }

    return (
      <form onSubmit={this.handleSubmit}>
        <label htmlFor="title-input">Title</label>
        <input id="title-input" name="title" />

        <label htmlFor="content-input">Content</label>
        <textarea id="content-input" name="content" />

        <label htmlFor="tags-input">Tags</label>
        <input id="tags-input" name="tags" />

        <button type="submit" disabled={this.state.isSaving}>
          Submit
        </button>
        {this.state.error ? (
          <div data-testid="error-msg">{this.state.error}</div>
        ) : null}
      </form>
    )
  }
}

export {Editor}
