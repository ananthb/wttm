port module Main exposing (main)

import Browser
import Html exposing (Html, button, div, h1, kbd, p, span, text)
import Html.Attributes exposing (class)
import Html.Events exposing (onClick)
import Http
import Json.Decode as D
import Json.Encode as E


port toScene : E.Value -> Cmd msg


port fromScene : (D.Value -> msg) -> Sub msg


port openUrl : String -> Cmd msg



-- Model


type Phase
    = Attract
    | Entering
    | Inside
    | Blue


type Status
    = Loading
    | Failed String
    | Ready Catalog


type alias App =
    { id : String
    , title : String
    , description : String
    , url : String
    , icon : String
    }


type alias Category =
    { id : String
    , label : String
    , icon : String
    , tier : Int
    , apps : List App
    }


type alias Catalog =
    { title : String
    , subtitle : String
    , email : Maybe String
    , categories : List Category
    }


type alias Model =
    { status : Status
    , phase : Phase
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( { status = Loading, phase = Attract }
    , Http.get { url = "/api/me", expect = Http.expectJson GotCatalog catalogDecoder }
    )



-- Update


type Msg
    = GotCatalog (Result Http.Error Catalog)
    | Scene D.Value
    | DismissBlue


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotCatalog (Ok catalog) ->
            ( { model | status = Ready catalog }
            , toScene (encodeCatalog catalog)
            )

        GotCatalog (Err err) ->
            ( { model | status = Failed (describeError err) }, Cmd.none )

        DismissBlue ->
            ( { model | phase = Attract }, toScene (E.object [ ( "type", E.string "reset" ) ]) )

        Scene value ->
            case D.decodeValue sceneDecoder value of
                Ok sceneEvent ->
                    case sceneEvent of
                        Pill "red" ->
                            ( { model | phase = Entering }
                            , toScene (E.object [ ( "type", E.string "enter" ) ])
                            )

                        Pill "blue" ->
                            ( { model | phase = Blue }, Cmd.none )

                        Pill _ ->
                            ( model, Cmd.none )

                        Open id ->
                            ( model, openApp id model )

                        Hovered _ ->
                            ( model, Cmd.none )

                        SceneReady ->
                            ( model, Cmd.none )

                        Entered ->
                            ( { model | phase = Inside }, Cmd.none )

                Err _ ->
                    ( model, Cmd.none )


openApp : String -> Model -> Cmd Msg
openApp id model =
    case model.status of
        Ready catalog ->
            catalog.categories
                |> List.concatMap .apps
                |> List.filter (\app -> app.id == id)
                |> List.head
                |> Maybe.map (\app -> openUrl app.url)
                |> Maybe.withDefault Cmd.none

        _ ->
            Cmd.none


describeError : Http.Error -> String
describeError err =
    case err of
        Http.BadUrl _ ->
            "bad url"

        Http.Timeout ->
            "timed out"

        Http.NetworkError ->
            "offline"

        Http.BadStatus code ->
            "http " ++ String.fromInt code

        Http.BadBody _ ->
            "bad response"



-- Subscriptions


subscriptions : Model -> Sub Msg
subscriptions _ =
    fromScene Scene



-- View


view : Model -> Html Msg
view model =
    div [ class "wttm scanlines vignette" ]
        [ Html.node "wttm-scene" [ class "scene" ] []
        , viewOverlay model
        ]


viewOverlay : Model -> Html Msg
viewOverlay model =
    div [ class "overlay" ]
        [ viewHud model
        , viewCrosshair model
        , viewStatus model
        , viewFooter model
        , viewBlue model
        ]


viewCrosshair : Model -> Html Msg
viewCrosshair model =
    case model.phase of
        Entering ->
            div [ class "crosshair" ] []

        Inside ->
            div [ class "crosshair" ] []

        _ ->
            text ""


viewHud : Model -> Html Msg
viewHud model =
    let
        ( title, subtitle ) =
            case model.status of
                Ready catalog ->
                    ( catalog.title, catalog.subtitle )

                _ ->
                    ( "Welcome To The Matrix", "Wake up." )

        who =
            case model.status of
                Ready catalog ->
                    catalog.email
                        |> Maybe.map (\email -> span [ class "who" ] [ text ("signed in as " ++ email) ])
                        |> Maybe.withDefault (span [ class "who" ] [])

                _ ->
                    span [ class "who" ] []
    in
    div [ class "hud" ]
        [ h1 [] [ text title ]
        , p [ class "subtitle" ] [ text subtitle ]
        , who
        ]


viewStatus : Model -> Html Msg
viewStatus model =
    case model.status of
        Loading ->
            div [ class "status" ] [ text "jack in" ]

        Failed why ->
            div [ class "status error" ] [ text ("signal lost · " ++ why) ]

        Ready _ ->
            text ""


viewFooter : Model -> Html Msg
viewFooter model =
    case model.phase of
        Blue ->
            text ""

        Attract ->
            div [ class "footer" ]
                [ div [ class "keys" ]
                    [ span [] [ text "choose a pill to wake up" ] ]
                , span [ class "brand" ] [ text "wttm" ]
                ]

        _ ->
            div [ class "footer" ]
                [ div [ class "keys" ]
                    [ span [] [ kbd [] [ text "W A S D" ], text " move" ]
                    , span [] [ kbd [] [ text "mouse" ], text " look" ]
                    , span [] [ kbd [] [ text "click" ], text " open" ]
                    , span [] [ kbd [] [ text "Esc" ], text " release" ]
                    ]
                , span [ class "brand" ] [ text "wttm" ]
                ]


viewBlue : Model -> Html Msg
viewBlue model =
    case model.phase of
        Blue ->
            div [ class "blue" ]
                [ div [ class "card" ]
                    [ Html.h2 [] [ text "The story ends" ]
                    , p []
                        [ text
                            "You wake up in your bed and believe whatever you want to believe. Ignorance is bliss."
                        ]
                    , button [ onClick DismissBlue ] [ text "Take the red pill" ]
                    ]
                ]

        _ ->
            text ""



-- Decoders / encoders


catalogDecoder : D.Decoder Catalog
catalogDecoder =
    D.map4 Catalog
        (D.field "title" D.string)
        (D.field "subtitle" D.string)
        (D.maybe (D.field "email" D.string))
        (D.field "categories" (D.list categoryDecoder))


categoryDecoder : D.Decoder Category
categoryDecoder =
    D.map5 Category
        (D.field "id" D.string)
        (D.field "label" D.string)
        (D.oneOf [ D.field "icon" D.string, D.succeed "" ])
        (D.oneOf [ D.field "tier" D.int, D.succeed 0 ])
        (D.field "apps" (D.list appDecoder))


appDecoder : D.Decoder App
appDecoder =
    D.map5 App
        (D.field "id" D.string)
        (D.field "title" D.string)
        (D.field "description" D.string)
        (D.field "url" D.string)
        (D.oneOf [ D.field "icon" D.string, D.succeed "" ])


type SceneEvent
    = Pill String
    | Open String
    | Hovered String
    | SceneReady
    | Entered


sceneDecoder : D.Decoder SceneEvent
sceneDecoder =
    D.field "type" D.string
        |> D.andThen
            (\kind ->
                case kind of
                    "pill" ->
                        D.map Pill (D.field "pill" D.string)

                    "open" ->
                        D.map Open (D.field "id" D.string)

                    "hover" ->
                        D.map Hovered (D.field "id" D.string)

                    "ready" ->
                        D.succeed SceneReady

                    "entered" ->
                        D.succeed Entered

                    _ ->
                        D.fail ("unknown scene event: " ++ kind)
            )


encodeCatalog : Catalog -> E.Value
encodeCatalog catalog =
    E.object
        [ ( "type", E.string "catalog" )
        , ( "title", E.string catalog.title )
        , ( "categories", E.list encodeCategory catalog.categories )
        ]


encodeCategory : Category -> E.Value
encodeCategory category =
    E.object
        [ ( "id", E.string category.id )
        , ( "label", E.string category.label )
        , ( "icon", E.string category.icon )
        , ( "tier", E.int category.tier )
        , ( "apps", E.list encodeApp category.apps )
        ]


encodeApp : App -> E.Value
encodeApp app =
    E.object
        [ ( "id", E.string app.id )
        , ( "title", E.string app.title )
        , ( "description", E.string app.description )
        , ( "icon", E.string app.icon )
        ]


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = subscriptions
        , view = view
        }
