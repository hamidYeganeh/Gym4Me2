"use client";
import { useId } from "react";
import { Info } from "lucide-react";
import { cn } from "../../lib/utils";
import { ToggleGroupItem } from "../ToggleGroup";
import { Switch } from "../Switch";
import { Button } from "../Button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../Tooltip";
import {
  choiceOptionCardVariants,
  choiceOptionCardStyles as s,
} from "./ChoiceOptionCard.styles";
import type { ChoiceOptionCardProps } from "./ChoiceOptionCard.types";

export function ChoiceOptionCard(props: ChoiceOptionCardProps) {
  const id = useId();
  const content = (
    <>
      {props.icon && (
        <span aria-hidden="true" className={s.icon()}>
          {props.icon}
        </span>
      )}
      <span className={s.content()}>
        <span className={s.label()}>{props.label}</span>
        {props.description && (
          <span className={s.description()}>{props.description}</span>
        )}
      </span>
      {props.supportingText && (
        <span className={s.supporting()}>{props.supportingText}</span>
      )}
    </>
  );
  return (
    <div
      data-slot="choice-option-card"
      className={cn(choiceOptionCardVariants(), props.className)}
    >
      {props.control === "switch" ? (
        <div className={s.switchRoot()}>
          <label htmlFor={id} className="flex flex-1 items-center gap-3">
            {content}
          </label>
          <Switch
            id={id}
            checked={props.checked}
            onCheckedChange={props.onCheckedChange}
            disabled={props.disabled}
          />
        </div>
      ) : props.control === "note" ? (
        <div className={s.note({ info: Boolean(props.info) })}>{content}</div>
      ) : (
        <ToggleGroupItem
          value={props.value}
          disabled={props.disabled}
          className={s.choice({ info: Boolean(props.info) })}
        >
          {content}
        </ToggleGroupItem>
      )}
      {props.info && props.control !== "switch" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              className={s.info()}
              variant="ghost"
              size="icon-lg"
              aria-label={props.infoLabel ?? props.label}
            >
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{props.info}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
