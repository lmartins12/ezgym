import { Component } from "@angular/core";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/angular/standalone";

@Component({
  selector: "app-workouts",
  templateUrl: "workouts.page.html",
  styleUrls: ["workouts.page.scss"],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class WorkoutsPage {}
