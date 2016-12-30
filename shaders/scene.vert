precision lowp float;

attribute vec2 vertexPositionNDC;

varying vec2 vTexCoords;

const vec2 scale = vec2(0.5, 0.5);

void main() {
	vec2 tempPosition = vertexPositionNDC * scale + scale; // scale vertex attribute to [0,1] range
	vTexCoords = vec2(tempPosition.x, 1.0 - tempPosition.y);
	gl_Position = vec4(vertexPositionNDC, 0, 1);
}