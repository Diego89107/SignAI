import React from "react";
import { useParams, Navigate } from "react-router-dom";
import LeccionAprender from "./LeccionAprender";
import * as categorias from "../../../data/categoriasAprender";

export default function LeccionRoute({ setSidebarOpen }) {
  const { categoria } = useParams();
  const items = categorias[categoria];

  if (!items || items.length === 0) {
    return <Navigate to="/Aprender" replace />;
  }

  return (
    <LeccionAprender
      key={categoria}
      items={items}
      setSidebarOpen={setSidebarOpen}
    />
  );
}
