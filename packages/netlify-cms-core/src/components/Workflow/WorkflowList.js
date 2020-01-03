import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { css } from '@emotion/core';
import styled from '@emotion/styled';
import moment from 'moment';
import { translate } from 'react-polyglot';
import { colors, lengths } from 'netlify-cms-ui-default';
import { status } from 'Constants/publishModes';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import WorkflowCard from './WorkflowCard';

const WorkflowListContainer = styled.div`
  min-height: 60%;
  display: grid;
  grid-template-columns: 33.3% 33.3% 33.3%;
`;

const WorkflowListContainerOpenAuthoring = styled.div`
  min-height: 60%;
  display: grid;
  grid-template-columns: 50% 50% 0%;
`;

const styles = {
  columnPosition: idx =>
    (idx === 0 &&
      css`
        margin-left: 0;
      `) ||
    (idx === 2 &&
      css`
        margin-right: 0;
      `) ||
    css`
      &:before,
      &:after {
        content: '';
        display: block;
        position: absolute;
        width: 2px;
        height: 80%;
        top: 76px;
        background-color: ${colors.textFieldBorder};
      }

      &:before {
        left: -23px;
      }

      &:after {
        right: -23px;
      }
    `,
  column: css`
    margin: 0 20px;
    transition: background-color 0.5s ease;
    border: 2px dashed transparent;
    border-radius: 4px;
    position: relative;
    height: 100%;
  `,
  columnHovered: css`
    border-color: ${colors.active};
  `,
  hiddenColumn: css`
    display: none;
  `,
  hiddenRightBorder: css`
    &:not(:first-child):not(:last-child) {
      &:after {
        display: none;
      }
    }
  `,
};

const ColumnHeader = styled.h2`
  font-size: 20px;
  font-weight: normal;
  padding: 4px 14px;
  border-radius: ${lengths.borderRadius};
  margin-bottom: 28px;

  ${props =>
    props.name === 'draft' &&
    css`
      background-color: ${colors.statusDraftBackground};
      color: ${colors.statusDraftText};
    `}

  ${props =>
    props.name === 'pending_review' &&
    css`
      background-color: ${colors.statusReviewBackground};
      color: ${colors.statusReviewText};
    `}

  ${props =>
    props.name === 'pending_publish' &&
    css`
      background-color: ${colors.statusReadyBackground};
      color: ${colors.statusReadyText};
    `}
`;

const ColumnCount = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text};
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const getColumnHeaderText = (columnName, t) => {
  switch (columnName) {
    case 'draft':
      return t('workflow.workflowList.draftHeader');
    case 'pending_review':
      return t('workflow.workflowList.inReviewHeader');
    case 'pending_publish':
      return t('workflow.workflowList.readyHeader');
  }
};

class WorkflowList extends React.Component {
  static propTypes = {
    entries: ImmutablePropTypes.orderedMap,
    handleChangeStatus: PropTypes.func.isRequired,
    handlePublish: PropTypes.func.isRequired,
    handleDelete: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    isOpenAuthoring: PropTypes.bool,
  };

  handleChangeStatus = (result) => {
    const { source, destination, draggableId } = result;
    const [collection, ...slug] = draggableId.split('/');
    this.props.handleChangeStatus(
      collection,
      slug.join('/'),
      source.droppableId,
      destination.droppableId,
    );
  };

  requestDelete = (collection, slug, ownStatus) => {
    if (window.confirm(this.props.t('workflow.workflowList.onDeleteEntry'))) {
      this.props.handleDelete(collection, slug, ownStatus);
    }
  };

  requestPublish = (collection, slug, ownStatus) => {
    if (ownStatus !== status.last()) {
      window.alert(this.props.t('workflow.workflowList.onPublishingNotReadyEntry'));
      return;
    } else if (!window.confirm(this.props.t('workflow.workflowList.onPublishEntry'))) {
      return;
    }
    this.props.handlePublish(collection, slug);
  };

  // eslint-disable-next-line react/display-name
  renderColumns = (entries, column) => {
    const { isOpenAuthoring } = this.props;
    if (!entries) return null;

    if (!column) {
      return entries.entrySeq().map(([currColumn, currEntries], idx) => (
        <Droppable droppableId={currColumn} key={currColumn}>
          {(provided, snapshot) => (
            <div ref={provided.innerRef} style={{ height: '100%' }}>
              <div
                css={[
                  styles.column,
                  styles.columnPosition(idx),
                  snapshot.isDraggingOver && styles.columnHovered,
                  isOpenAuthoring && currColumn === 'pending_publish' && styles.hiddenColumn,
                  isOpenAuthoring && currColumn === 'pending_review' && styles.hiddenRightBorder,
                ]}
              >
                <ColumnHeader name={currColumn}>
                  {getColumnHeaderText(currColumn, this.props.t)}
                </ColumnHeader>
                <ColumnCount>
                  {this.props.t('workflow.workflowList.currentEntries', {
                    smart_count: currEntries.size,
                  })}
                </ColumnCount>
                {this.renderColumns(currEntries, currColumn)}
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ));
    }
    return (
      <div>
        {entries.map((entry, idx) => {
          const timestamp = moment(entry.getIn(['metaData', 'timeStamp'])).format('MMMM D');
          const slug = entry.get('slug');
          const editLink = `collections/${entry.getIn(['metaData', 'collection'])}/entries/${slug}`;
          const ownStatus = entry.getIn(['metaData', 'status']);
          const collection = entry.getIn(['metaData', 'collection']);
          const isModification = entry.get('isModification');
          const canPublish = ownStatus === status.last() && !entry.get('isPersisting', false);
          return (
            <Draggable
              draggableId={`${collection}/${slug}`}
              index={idx}
              key={`${collection}-${slug}`}
            >
              {provided => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <WorkflowCard
                    collectionName={collection}
                    title={entry.get('label') || entry.getIn(['data', 'title'])}
                    authorLastChange={entry.getIn(['metaData', 'user'])}
                    body={entry.getIn(['data', 'body'])}
                    isModification={isModification}
                    editLink={editLink}
                    timestamp={timestamp}
                    onDelete={this.requestDelete.bind(this, collection, slug, ownStatus)}
                    canPublish={canPublish}
                    onPublish={this.requestPublish.bind(this, collection, slug, ownStatus)}
                  />
                </div>
              )}
            </Draggable>
          );
        })}
      </div>
    );
  };

  render() {
    const columns = this.renderColumns(this.props.entries);
    const ListContainer = this.props.isOpenAuthoring
      ? WorkflowListContainerOpenAuthoring
      : WorkflowListContainer;
    return (
      <DragDropContext onDragEnd={this.handleChangeStatus}>
        <ListContainer>{columns}</ListContainer>
      </DragDropContext>
    );
  }
}

export default translate()(WorkflowList);
