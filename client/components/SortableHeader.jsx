/** @jsx h */
import { h, Component } from "preact";

import Icon from "./Icon";

class SortableHeader extends Component {
  render() {
    const { onClick, id, sort, children, ...rest } = this.props;

    return (
      <th
        style={{
          cursor: "pointer",
          backgroundColor: id === sort.key ? "#e8ddf1" : "inherit"
        }}
        onClick={this.handleOnClick}
        {...rest}
      >
        {children}
        {id === sort.key && (
          <span style={{ marginLeft: 5 }}>
            <Icon
              name="arrow-right"
              size={8}
              rotate={sort.order === "ASC" ? 270 : 90}
            />
          </span>
        )}
      </th>
    );
  }

  handleOnClick = () => {
    this.props.onClick(this.props.id);
  };
}

export default SortableHeader;
