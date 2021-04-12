/** @jsx h */
import { h } from "preact";

import SwitcherItem from "./SwitcherItem";
import s from "./Switcher.css";
import PureComponent from "../lib/PureComponent";

export default class Switcher extends PureComponent {
  render() {
    const { label, items, activeItem, onSwitch, separateLines } = this.props;

    return (
      <div className={s.container}>
        <div className={s.label}>{label}:</div>
        <div
          className={s.wrapper}
          style={{ ...(separateLines ? { display: "block" } : {}) }}
        >
          {items.map(item => (
            <SwitcherItem
              key={item.label}
              className={s.item}
              style={{ ...(separateLines ? { display: "block" } : {}) }}
              item={item}
              active={item === activeItem}
              onClick={onSwitch}
            />
          ))}
        </div>
      </div>
    );
  }
}
