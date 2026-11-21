{{- define "finagent.labels" -}}
app.kubernetes.io/part-of: finagent
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end -}}
{{- define "finagent.requireResources" -}}
{{- $name := .name -}}
{{- $resources := .resources -}}
{{- if not (kindIs "map" $resources) -}}
{{- fail (printf "%s.resources must define requests and limits" $name) -}}
{{- end -}}
{{- range $section := list "requests" "limits" -}}
  {{- $values := index $resources $section -}}
  {{- if not (kindIs "map" $values) -}}
    {{- fail (printf "%s.resources.%s must define cpu and memory" $name $section) -}}
  {{- end -}}
  {{- range $resource := list "cpu" "memory" -}}
    {{- if not (index $values $resource) -}}
      {{- fail (printf "%s.resources.%s.%s is required" $name $section $resource) -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- end -}}
{{- define "finagent.securityContext" -}}
securityContext:
  runAsNonRoot: true
  runAsUser: {{ . }}
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities: {drop: ["ALL"]}
  seccompProfile: {type: RuntimeDefault}
{{- end -}}
