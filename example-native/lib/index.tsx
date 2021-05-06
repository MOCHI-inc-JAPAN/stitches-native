import { createElement, forwardRef, memo } from 'react';

import {
  AllStyleProperty,
  AnyStyleProperty,
  StyledComponent
} from './rn.types';

import { Config, StyledConfig, ComponentProps } from './types';
import { getCompoundKey, processStyles } from './utils';

const ReactNative = require('react-native');

export function createCss<C extends Config>(config: C) {
  function styled<T extends StyledComponent, S extends StyledConfig<T, C>>(
    component: T,
    styledConfig: S
  ) {
    const {
      variants = {},
      compoundVariants = [],
      defaultVariants = {},
      ...styles
    } = styledConfig;

    const styleSheet = ReactNative.StyleSheet.create({
      base: styles ? processStyles(styles as any, config) : {},
      // Variant styles
      ...Object.entries(variants).reduce(
        (acc, [vartiantProp, variantValues]) => {
          Object.entries(variantValues).forEach(
            ([variantName, variantValue]) => {
              // Eg. `color_primary` or `size_small`
              const key = `${vartiantProp}_${variantName}`;
              acc[key] = processStyles((variantValue || {}) as any, config);
            }
          );
          return acc;
        },
        {} as { [key: string]: AnyStyleProperty }
      ),
      // Compound variant styles
      ...compoundVariants.reduce((acc, compoundVariant) => {
        const { css, ...compounds } = compoundVariant;
        const compoundEntries = Object.entries(compounds);

        if (compoundEntries.length > 1) {
          const key = getCompoundKey(compoundEntries);
          acc[key] = processStyles((css || {}) as any, config);
        }

        return acc;
      }, {} as { [key: string]: AnyStyleProperty })
    });

    const Comp = forwardRef<any, ComponentProps<T, C, S>>((props: any, ref) => {
      let variantStyles = [];
      let compoundVariantStyles = [];

      if (variants) {
        variantStyles = Object.keys(variants)
          .map(prop => {
            const key = `${prop}_${props[prop] || defaultVariants[prop]}`;
            return styleSheet[key];
          })
          .filter(Boolean);
      }

      if (compoundVariants) {
        compoundVariantStyles = compoundVariants
          .map(compoundVariant => {
            const { css, ...compounds } = compoundVariant;
            const compoundEntries = Object.entries(compounds);

            if (
              compoundEntries.every(([prop, value]) => props[prop] === value)
            ) {
              const key = getCompoundKey(compoundEntries);
              return styleSheet[key];
            }
          })
          .filter(Boolean);
      }

      return createElement(ReactNative[component], {
        ...props,
        style: [
          styleSheet.base,
          ...variantStyles,
          ...compoundVariantStyles,
          processStyles(props.css || {}, config),
          props.style
        ],
        ref
      });
    });

    return memo(Comp);
  }

  const css = (cssStyles: AllStyleProperty) => ({});

  return { styled, css };
}