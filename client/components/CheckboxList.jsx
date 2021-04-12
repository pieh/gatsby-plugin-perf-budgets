/** @jsx h */
import { h } from "preact";
import filesize from "filesize";

import CheckboxListItem from "./CheckboxListItem";
import s from "./CheckboxList.css";
import PureComponent from "../lib/PureComponent";

const ALL_ITEM = Symbol("ALL_ITEM");

// const groupMapping = {
//   "page-data": ""
// };

const groupOrder = [
  {
    type: "app-chunk",
    label: "Application level chunks (shared with all pages)"
  },
  {
    type: "page-chunk",
    label: "Template level chunks (shared with all pages using this template)"
  },
  {
    type: "module-chunk",
    label: "Page level chunks"
  },
  {
    type: "app-data",
    label: "Application level data (shared with all pages)"
  },
  {
    type: "page-data",
    label: "Page level data"
  },
  {
    type: "other",
    label: "Not classified"
  }
];

const groupItems = items => {
  // if (group) {
  const groups = {
    "page-data": [],
    "module-chunk": [],
    "app-chunk": [],
    "page-chunk": [],
    "app-data": [],
    other: []
  };

  const sizes = {
    "page-data": {
      parsedSize: 0,
      gzipSize: 0
    },
    "module-chunk": {
      parsedSize: 0,
      gzipSize: 0
    },
    "app-chunk": {
      parsedSize: 0,
      gzipSize: 0
    },
    "page-chunk": {
      parsedSize: 0,
      gzipSize: 0
    },
    "app-data": {
      parsedSize: 0,
      gzipSize: 0
    },
    other: {
      parsedSize: 0,
      gzipSize: 0
    }
  };

  // const groups = {

  // }

  items.forEach(item => {
    const arr = groups[item.type] || groups.other;

    const sizeObj = sizes[item.type] || sizes.other;

    sizeObj.gzipSize += item.gzipSize;
    sizeObj.parsedSize += item.parsedSize;

    arr.push(item);
  });

  const result = [];

  groupOrder.forEach(({ type, label }) => {
    const groupItems = groups[type];

    if (groupItems.length) {
      result.push({
        label,
        ui: "group",
        ...sizes[type]
      });
      result.push(...groupItems);
    }
  });

  return result;
};

export default class CheckboxList extends PureComponent {
  static ALL_ITEM = ALL_ITEM;

  constructor(props) {
    super(props);
    this.state = {
      checkedItems: props.checkedItems || props.items,
      renderItems: props.group ? groupItems(props.items) : props.items
    };
  }

  componentWillReceiveProps(newProps) {
    if (newProps.items !== this.props.items) {
      if (this.isAllChecked()) {
        // Preserving `all checked` state
        this.setState({
          checkedItems: newProps.items,
          renderItems: newProps.group
            ? groupItems(newProps.items)
            : newProps.items
        });
        this.informAboutChange(newProps.items);
      } else if (this.state.checkedItems.length) {
        // Checking only items that are in the new `items` array
        const checkedItems = newProps.items.filter(item =>
          this.state.checkedItems.find(
            checkedItem => checkedItem.label === item.label
          )
        );

        this.setState({
          checkedItems,
          renderItems: newProps.group
            ? groupItems(newProps.items)
            : newProps.items
        });
        this.informAboutChange(checkedItems);
      }
    } else if (newProps.checkedItems !== this.props.checkedItems) {
      this.setState({ checkedItems: newProps.checkedItems });
    }
  }

  render() {
    const { label, items, renderLabel, showAll } = this.props;
    const { renderItems } = this.state;

    // let renderItems = items

    return (
      <div className={s.container}>
        <div className={s.label}>{label}:</div>
        <div>
          {showAll !== false && (
            <CheckboxListItem
              item={ALL_ITEM}
              checked={this.isAllChecked()}
              onChange={this.handleToggleAllCheck}
            >
              {renderLabel}
            </CheckboxListItem>
          )}
          {renderItems.map(item => {
            if (item.ui === "group") {
              return (
                <div style={{ margin: "10px 0" }}>
                  {item.label} (
                  <strong>{filesize(item[this.props.activeSize])}</strong>)
                </div>
              );
            }

            return (
              <CheckboxListItem
                key={item.label}
                item={item}
                checked={this.isItemChecked(item)}
                onChange={this.handleItemCheck}
              >
                {renderLabel}
              </CheckboxListItem>
            );
          })}
        </div>
      </div>
    );
  }

  handleToggleAllCheck = () => {
    const checkedItems = this.isAllChecked() ? [] : this.props.items;
    this.setState({ checkedItems });
    this.informAboutChange(checkedItems);
  };

  handleItemCheck = item => {
    let checkedItems;

    if (this.isItemChecked(item)) {
      checkedItems = this.state.checkedItems.filter(
        checkedItem => checkedItem !== item
      );
    } else {
      checkedItems = [...this.state.checkedItems, item];
    }

    this.setState({ checkedItems });
    this.informAboutChange(checkedItems);
  };

  isItemChecked(item) {
    return this.state.checkedItems.includes(item);
  }

  isAllChecked() {
    return this.props.items.length === this.state.checkedItems.length;
  }

  informAboutChange(checkedItems) {
    setTimeout(() => this.props.onChange(checkedItems));
  }
}
