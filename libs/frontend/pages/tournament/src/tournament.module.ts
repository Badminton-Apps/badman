import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import {
  DetailDrawComponent,
  DetailPageComponent,
  EditPageComponent,
  OverviewPageComponent,
} from "./pages";
import { DrawResolver, EventResolver } from "./resolver";

const MODULE_ROUTES: Routes = [
  {
    path: "",
    component: OverviewPageComponent,
  },
  {
    path: ":id",
    runGuardsAndResolvers: "always",
    resolve: {
      eventTournament: EventResolver,
    },
    data: {
      breadcrumb: {
        alias: "eventTournament",
      },
    },
    children: [
      {
        path: "",
        runGuardsAndResolvers: "always",
        component: DetailPageComponent,
      },
      {
        path: "edit",
        runGuardsAndResolvers: "always",
        component: EditPageComponent,
        data: {
          breadcrumb: "Edit",
        },
      },
      {
        path: "draw/:id",
        runGuardsAndResolvers: "always",
        resolve: {
          drawTournament: DrawResolver,
        },
        data: {
          breadcrumb: {
            alias: "drawTournament",
          },
        },
        children: [
          {
            path: "",
            component: DetailDrawComponent,
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(MODULE_ROUTES)],
  providers: [EventResolver, DrawResolver, OverviewPageComponent, DetailPageComponent],
})
export class TournamentModule {}
