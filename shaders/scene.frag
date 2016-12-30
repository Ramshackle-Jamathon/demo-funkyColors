//Distance field functions found here : http://www.iquilezles.org/www/articles/distfunctions/distfunctions.html
precision mediump float;

uniform float uGlobalTime;
uniform vec2 uResolution;
uniform sampler2D uWebcamTexture;
uniform float uColorInterpolateStep;

varying vec2 vTexCoords;

// Filmic tone mapping:
// http://filmicgames.com/archives/75
vec3 toneMap(in vec3 c) {
	c = pow(c,vec3(2.0));
	vec3 x = max(vec3(0.0),c-vec3(0.004));
	c = (x*(6.2*x+.5))/(x*(6.2*x+1.7)+0.06);
	return c;
}

// Solid color with a little bit of normal :-)
vec3 getColor(vec3 normal) {
	return mix(vec3(1.0),abs(normal),uColorInterpolateStep); 
}

void main()
{
	vec4 tex = texture2D(uWebcamTexture, vTexCoords);
	vec3 color = getColor(normalize(tex.xyz));
	gl_FragColor = vec4(toneMap(color),1.0);
}
